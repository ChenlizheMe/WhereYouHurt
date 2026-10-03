import React from 'react';

export default function DiagnosisCard({condition,index,lang,copy,displayWhy}){
 const text=value=>value?.[lang]||'';
 const summary=lang==='zh'?condition.summary:condition.summaryEn;
 return <article className="card compact-card">
  <div className="card-heading"><span className="rank">{String(index+1).padStart(2,'0')}</span><div className="condition">{text(condition.name)}</div></div>
  <div className="line evidence-line"><b>{copy.basis}</b><div>{condition.why.map(reason=><span key={reason}>{displayWhy(reason)}</span>)}</div></div>
  {summary&&<p className="condition-summary compact-preview">{summary}</p>}
  <details className="card-details">
   <summary><span className="advice-preview compact-preview">{text(condition.advice)}</span><span className="card-expand">{lang==='zh'?'展开完整建议':'Show full advice'}</span><span className="card-collapse">{lang==='zh'?'收起':'Collapse'}</span></summary>
   <div className="card-detail-body">
    {summary&&<p className="condition-summary">{summary}</p>}
    <div className="advice"><b>{copy.advice}</b><p>{text(condition.advice)}</p></div>
    {condition.redFlags&&<div className="red-flags"><b>{copy.redFlags}</b><p>{text(condition.redFlags)}</p></div>}
    {condition.medication&&<div className="medication-info"><b>{copy.medication}</b><p>{text(condition.medication)}</p></div>}
   </div>
  </details>
 </article>;
}
