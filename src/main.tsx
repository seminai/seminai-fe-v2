import "./public-styles.css";
const privateRoute =
  /^\/(?:auth|dashboard|settings|label|new-label|fields|company|production-unit|new-production-unit|products|new-product|job|operations|field-notes|dosage-agent-chat|admin-data-totals|create-company-field-production|new-workspace|workspace|diventa-beta-tester)(?:\/|$)/;
if (privateRoute.test(location.pathname)) void import("./private-main");
else void import("./public-main");
