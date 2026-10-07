export const metadata = { title: "Audit instructions" };

const repoUrl = process.env.NEXT_PUBLIC_ANALYSIS_REPO_URL ?? "";

export default function AuditPage() {
  return (
    <>
      <h1>Instructions for an independent audit</h1>
      <h2>1. Obtain the bundle</h2>
      <p>After data collection closes, the faculty advisor (the study&apos;s Research Advisor, the only role allowed to download it) downloads the audit bundle from the study platform and gives it to the auditor. It contains de-identified data only, labelled by Study ID.</p>
      <h2>2. Check integrity</h2>
      <p>Open <a href="/verify">Verify a bundle</a> and choose the .zip file. All checks should pass. The page also shows the plan version and source commit that produced the results.</p>
      <h2>3. Reproduce the results independently</h2>
      <p>Unzip the bundle and run either script from inside the folder. Each one re-scores the questionnaire from the raw answers, recomputes every statistic with standard libraries, and prints PASS or FAIL for each value.</p>
      <pre>{`python3 -m pip install numpy scipy
python3 audit/reproduce.py

Rscript -e 'install.packages("jsonlite")'
Rscript audit/reproduce.R`}</pre>
      <p>The same scripts can be downloaded here: <a href="/downloads/reproduce.py">reproduce.py</a>, <a href="/downloads/reproduce.R">reproduce.R</a>.</p>
      <h2>4. Optional manual cross-check</h2>
      <p>Open <code>data/scores_wide.csv</code> in SPSS with <a href="/downloads/reproduce.sps">reproduce.sps</a>, or in JASP (Paired Samples T-Test with the Shapiro-Wilk and Wilcoxon options). The SPSS syntax was not run during development; the Python and R scripts are the tested reproductions.</p>
      <h2>5. Confirm the code version</h2>
      <p>The bundle&apos;s <code>manifest.json</code> records the plan version and source commit. Compare them with the tagged release in the source repository{repoUrl && <> (<a href={repoUrl}>{repoUrl}</a>)</>} to confirm the plan was fixed before data collection began.</p>
      <h2>Reporting a difference</h2>
      <p>Differences beyond the sixth decimal place, in any count, or in which test was selected should be reported to the faculty advisor and the principal investigator before any result is used.</p>
    </>
  );
}
