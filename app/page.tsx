export default function Overview() {
  return (
    <>
      <h1>Independent audit of the study analysis</h1>
      <p>
        This site documents how the outcome data for the study <em>Compassion Cultivation as a High-Leverage Intervention for the
        Mitigation of Occupational Distress Syndrome (Burnout)</em> (study code LKM-SNF-2026) are analysed, and gives anyone the tools to
        check the results without relying on the platform that collected the data.
      </p>
      <div className="card">
        <strong>Three safeguards</strong>
        <ol>
          <li><strong>The plan is fixed in advance.</strong> Every test, threshold and decision rule is written in code and locked before data collection begins. The <a href="/plan">analysis plan</a> page shows it exactly as the software applies it.</li>
          <li><strong>The software is validated.</strong> The statistical routines are checked against SciPy (Python) and R on reference data. See <a href="/validation">validation</a>.</li>
          <li><strong>Every result can be reproduced independently.</strong> After data collection closes, the faculty advisor can produce an audit bundle of de-identified data, the plan and the results. Anyone given the bundle can <a href="/verify">verify it</a> in this browser and rerun the whole analysis in Python or R using the <a href="/audit">audit instructions</a>.</li>
        </ol>
      </div>
      <h2>What this site does not do</h2>
      <p>
        It does not store, receive or display any participant data. Study data stay on the study platform, where analysis is locked until
        every participant has finished and access follows the roles approved by the Institutional Review Board. A bundle checked on the
        verify page is read inside your own browser and is not uploaded.
      </p>
      <h2>See it working</h2>
      <p>
        The <a href="/demo">demo</a> runs the real analysis software on simulated participants and shows the report, results files and
        audit bundle exactly as the study team will see them. Simulated data describe no real person.
      </p>
    </>
  );
}
