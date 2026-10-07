* Encoding: UTF-8.
* SPSS cross-check for the LKM-SNF-2026 analysis.
* STATUS: provided for the statistician's convenience. This syntax was NOT
* executed during development because SPSS was not available. The Python and
* R scripts in this folder are the tested independent reproductions.
*
* Uses data/scores_wide.csv (subscale scores per participant and time point,
* blank = missing). Edit the CD path below to the unzipped bundle folder.

CD 'C:\path\to\audit-bundle'.

GET DATA
  /TYPE=TXT
  /FILE='data/scores_wide.csv'
  /ENCODING='UTF8'
  /DELCASE=LINE
  /DELIMITERS=","
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
    study_id A16
    personal_pre F10.6 personal_post F10.6 personal_followup F10.6
    work_pre F10.6 work_post F10.6 work_followup F10.6
    patient_pre F10.6 patient_post F10.6 patient_followup F10.6.
EXECUTE.

* Paired differences (later minus earlier; negative = less burnout).
COMPUTE d_personal_t2 = personal_post - personal_pre.
COMPUTE d_work_t2 = work_post - work_pre.
COMPUTE d_patient_t2 = patient_post - patient_pre.
COMPUTE d_personal_t3 = personal_followup - personal_pre.
COMPUTE d_work_t3 = work_followup - work_pre.
COMPUTE d_patient_t3 = patient_followup - patient_pre.
EXECUTE.

* Descriptives by time point.
DESCRIPTIVES VARIABLES=personal_pre personal_post personal_followup
  work_pre work_post work_followup patient_pre patient_post patient_followup
  /STATISTICS=MEAN STDDEV MIN MAX.

* Shapiro-Wilk on each set of differences (Tests of Normality table).
EXAMINE VARIABLES=d_personal_t2 d_work_t2 d_patient_t2 d_personal_t3 d_work_t3 d_patient_t3
  /PLOT NPPLOT
  /STATISTICS DESCRIPTIVES
  /MISSING PAIRWISE.

* Paired t tests (use where Shapiro-Wilk p >= .05).
T-TEST PAIRS=personal_pre work_pre patient_pre personal_pre work_pre patient_pre
  WITH personal_post work_post patient_post personal_followup work_followup patient_followup (PAIRED)
  /CRITERIA=CI(.95)
  /MISSING=ANALYSIS.

* Wilcoxon signed-rank tests (use where Shapiro-Wilk p < .05).
* SPSS reports the asymptotic p value unless the Exact Tests option is used;
* results.json uses the exact p value when there are no ties or zero differences.
NPAR TESTS
  /WILCOXON=personal_pre work_pre patient_pre personal_pre work_pre patient_pre
  WITH personal_post work_post patient_post personal_followup work_followup patient_followup (PAIRED)
  /MISSING ANALYSIS.

* Holm adjustment is not built into these procedures. Within each comparison
* (T1-T2, then T1-T3), sort the three p values from smallest to largest and
* multiply them by 3, 2 and 1; carry forward the running maximum; cap at 1.
