# Independent reproduction of the LKM-SNF-2026 analysis (R).
#
# Written separately from the ReSIP TypeScript engine and from the Python
# script. Uses base R statistics (shapiro.test, t.test, wilcox.test,
# p.adjust) and the jsonlite package to read plan.json and results.json.
#
# Usage (from inside an unzipped audit bundle):
#   Rscript audit/reproduce.R            # or: Rscript audit/reproduce.R path/to/bundle
# Requires: R 4.0+, install.packages("jsonlite")
# Exit status 0 = every check passed, 1 = at least one difference.

suppressPackageStartupMessages(library(jsonlite))
args <- commandArgs(trailingOnly = TRUE)
root <- if (length(args)) args[1] else getwd()
tol <- 1e-6

plan <- fromJSON(file.path(root, "plan.json"), simplifyVector = FALSE)
res <- fromJSON(file.path(root, "results.json"), simplifyVector = FALSE)
rd <- function(f) read.csv(file.path(root, "data", f), colClasses = "character", na.strings = "")

sc <- plan$scoring
subs <- c("personal", "work", "patient")
tps <- c("pre", "post", "followup")
MIN <- plan$minimumReportableGroup
item_scores <- unlist(sc$itemScores)
rev_items <- unlist(sc$reverseScoredItems)

parts <- rd("participants.csv")
ids <- sort(parts$study_id)
resp <- rd("responses.csv")
resp <- resp[resp$study_id %in% ids, ]
resp <- resp[order(resp$study_id, resp$timepoint, resp$submitted_at), ]
resp <- resp[!duplicated(resp[, c("study_id", "timepoint")]), ]

# ---- scoring
score_tab <- data.frame(study_id = resp$study_id, timepoint = resp$timepoint, stringsAsFactors = FALSE)
for (s in subs) {
  items <- unlist(sc$subscaleItems[[s]])
  minimum <- sc$minimumItemsAnswered[[s]]
  score_tab[[s]] <- apply(resp, 1, function(r) {
    v <- sapply(items, function(k) {
      x <- r[[sprintf("item_%02d", k)]]
      if (is.na(x)) return(NA_real_)
      sc_ <- item_scores[as.integer(x)]
      if (k %in% rev_items) 100 - sc_ else sc_
    })
    v <- v[!is.na(v)]
    if (length(v) >= minimum) mean(v) else NA_real_
  })
}
get_score <- function(id, tp, s) {
  x <- score_tab[score_tab$study_id == id & score_tab$timepoint == tp, s]
  if (length(x)) x else NA_real_
}

# ---- Hodges-Lehmann estimate with exact CI from Walsh averages
hodges_lehmann <- function(d) {
  n <- length(d)
  w <- outer(d, d, "+") / 2
  walsh <- sort(w[upper.tri(w, diag = TRUE)])
  qu <- qsignrank(0.025, n)
  if (qu == 0) qu <- 1
  c(median(walsh), walsh[qu], walsh[length(walsh) - qu + 1])
}

# ---- comparisons
checks <- list()
chk <- function(label, ours, theirs, tolerance = tol) {
  if (is.null(theirs)) theirs <- NA
  ok <- if (is.na(ours) && is.na(theirs)) TRUE
        else if (is.character(ours) || is.character(theirs)) identical(as.character(ours), as.character(theirs))
        else if (is.na(ours) || is.na(theirs)) FALSE
        else abs(as.numeric(ours) - as.numeric(theirs)) <= tolerance
  checks[[length(checks) + 1]] <<- list(ok = ok, label = label, ours = ours, theirs = theirs)
}
find_cmp <- function(id, s) Filter(function(x) x$id == id && x$subscale == s, res$comparisons)[[1]]

for (cmp in plan$comparisons) {
  fam <- list()
  for (s in subs) {
    a <- sapply(ids, get_score, tp = cmp$from, s = s)
    b <- sapply(ids, get_score, tp = cmp$to, s = s)
    keep <- !is.na(a) & !is.na(b)
    d <- b[keep] - a[keep]
    out <- list(subscale = s, n = length(d))
    if (length(d) >= MIN) {
      sw <- shapiro.test(d)
      out$meanDiff <- mean(d); out$W <- unname(sw$statistic); out$swP <- sw$p.value
      if (sw$p.value >= plan$normalityAlpha) {
        tt <- t.test(b[keep], a[keep], paired = TRUE)
        out$test <- "paired t"; out$t <- unname(tt$statistic); out$p <- tt$p.value
        out$ciLow <- tt$conf.int[1]; out$ciHigh <- tt$conf.int[2]; out$dz <- mean(d) / sd(d)
      } else {
        nz <- d[d != 0]
        exact_ok <- length(nz) <= 50 && !any(duplicated(abs(nz))) && length(nz) == length(d)
        wt <- suppressWarnings(wilcox.test(nz, exact = exact_ok, correct = FALSE))
        vplus <- unname(wt$statistic)
        hl <- hodges_lehmann(d)
        out$test <- "Wilcoxon signed-rank"; out$p <- wt$p.value
        out$statistic <- min(vplus, length(nz) * (length(nz) + 1) / 2 - vplus)
        out$hl <- hl[1]; out$hlLow <- hl[2]; out$hlHigh <- hl[3]
      }
    }
    fam[[s]] <- out
  }
  testable <- Filter(function(x) !is.null(x$p), fam)
  adj <- p.adjust(sapply(testable, `[[`, "p"), method = "holm")
  for (s in names(testable)) fam[[s]]$pHolm <- adj[[s]]

  for (s in subs) {
    o <- fam[[s]]; r <- find_cmp(cmp$id, s); tag <- paste(cmp$id, s)
    chk(paste0(tag, ": n"), o$n, r$n)
    if (is.null(o$meanDiff)) { chk(paste0(tag, ": suppressed"), NA, r$p); next }
    chk(paste0(tag, ": mean difference"), o$meanDiff, r$meanDiff)
    chk(paste0(tag, ": Shapiro-Wilk W"), o$W, r$normality$w, 1e-4)
    chk(paste0(tag, ": Shapiro-Wilk p"), o$swP, r$normality$p, 1e-4)
    chk(paste0(tag, ": test selected"), o$test, r$test)
    chk(paste0(tag, ": p"), o$p, r$p, 1e-5)
    chk(paste0(tag, ": Holm-adjusted p"), o$pHolm, r$pHolm, 1e-5)
    if (o$test == "paired t") {
      chk(paste0(tag, ": t"), o$t, r$pairedT$t)
      chk(paste0(tag, ": 95% CI low"), o$ciLow, r$pairedT$ciLow, 1e-5)
      chk(paste0(tag, ": 95% CI high"), o$ciHigh, r$pairedT$ciHigh, 1e-5)
      chk(paste0(tag, ": Cohen's dz"), o$dz, r$pairedT$dz)
    } else {
      chk(paste0(tag, ": Wilcoxon statistic"), o$statistic, r$wilcoxon$statistic)
      chk(paste0(tag, ": Hodges-Lehmann"), o$hl, r$wilcoxon$hl)
      chk(paste0(tag, ": HL CI low"), o$hlLow, r$wilcoxon$hlCiLow)
      chk(paste0(tag, ": HL CI high"), o$hlHigh, r$wilcoxon$hlCiHigh)
    }
  }
}

# ---- descriptives
for (tp in tps) for (s in subs) {
  v <- na.omit(sapply(ids, get_score, tp = tp, s = s))
  r <- res$descriptives[[tp]][[s]]
  if (length(v) < MIN) { chk(paste(tp, s, ": suppressed"), NA, if (is.null(r)) NA else 0); next }
  chk(paste(tp, s, ": n"), length(v), r$n)
  chk(paste(tp, s, ": mean"), mean(v), r$mean)
  chk(paste(tp, s, ": sd"), sd(v), r$sd)
  chk(paste(tp, s, ": median"), median(v), r$median)
}

# ---- adherence and flow
started <- ids[ids %in% score_tab$study_id[score_tab$timepoint == "pre"]]
ses <- rd("sessions.csv")
ses <- ses[ses$study_id %in% started & as.integer(ses$study_day) >= 1 & as.integer(ses$study_day) <= 30, ]
totals <- table(factor(ses$study_id, levels = started))
chk("Adherence: participants who started", length(started), res$adherence$participants)
chk("Adherence: protocol adherent", sum(totals >= plan$adherence$minimumSessions), res$adherence$adherent)
for (tp in tps) chk(paste("Completed", tp), sum(score_tab$timepoint == tp), res$flow$completed[[tp]])

failed <- 0
for (c in checks) {
  if (c$ok) cat("PASS ", c$label, "\n") else {
    failed <- failed + 1
    cat("FAIL ", c$label, "  independent=", format(c$ours), " platform=", format(c$theirs), "\n")
  }
}
cat(sprintf("\n%d of %d checks passed (%s).\n", length(checks) - failed, length(checks), R.version.string))
quit(status = if (failed) 1 else 0)
