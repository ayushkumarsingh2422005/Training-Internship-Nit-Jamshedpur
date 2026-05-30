import { applicationFormMeta } from "@/lib/application-form";

export function ApplicationFormHeader() {
  return (
    <header className="application-form-letterhead">
      <div className="application-form-letterhead-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nitjsrlogo.png" alt="" className="application-form-letterhead-logo" width={80} height={80} />
      </div>

      <div className="application-form-letterhead-text">
        <p className="application-form-letterhead-title">{applicationFormMeta.letterheadTitle}</p>
        <p className="application-form-letterhead-department">{applicationFormMeta.letterheadDepartment}</p>
        <p className="application-form-letterhead-subtitle">{applicationFormMeta.letterheadSubtitle}</p>
        <h3 className="application-form-form-title">{applicationFormMeta.title}</h3>
        <p className="application-form-session">Session: {applicationFormMeta.session}</p>
      </div>

      <div className="application-form-letterhead-emblem-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Jharkhand_Rajakiya_Chihna.svg"
          alt=""
          className="application-form-letterhead-emblem"
          width={80}
          height={80}
        />
      </div>
    </header>
  );
}
