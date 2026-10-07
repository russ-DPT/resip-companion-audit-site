# Suggested wording for the DSP proposal (Analysis section)

Replace the first two sentences of the Analysis section ("Data will be
analyzed using IBM SPSS Statistics, with Microsoft Excel used for data
management, in consultation with the Nebraska Methodist College
statistician. After the follow-up window closes, ...") with:

> Data will be analyzed with a pre-specified analysis program developed for
> this project with the assistance of an artificial intelligence coding tool,
> in consultation with the Nebraska Methodist College statistician. Every
> test, threshold, and decision rule described in this section is written
> into the program and locked as a dated, publicly released version before
> data collection begins, so that the analysis cannot be altered after
> outcome data exist. The program's statistical routines were validated
> against SciPy and R on reference data, and simulated studies were
> reproduced independently in both. The program runs on the study platform,
> remains locked until every participant has completed or left the study,
> and records each analysis run. After data collection closes, the faculty
> advisor will export a de-identified audit bundle containing the data,
> the locked plan, and the results, which can be verified and reproduced
> independently in Python, R, or SPSS.

Keep the remainder of the paragraph (two files, coding scheme, recalculation
of subscale scores, missing data). In the second paragraph, add after the
Wilcoxon sentence: "For the Wilcoxon test, the Hodges-Lehmann median
difference will be reported with its exact 95% confidence interval."
