import { fmtMLocal, today } from './utils'

// Simple local fmtM since we can't import the component version
function fmtM(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

export function generateEstimateText(d, settings = {}) {
  const co = settings
  const expiry = d.expiryDate ? new Date(d.expiryDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '30 days from date of issue'

  let doc = `${co.coName || 'PROLINE RESIDENTIAL LLC'}\n`
  if (co.coPhone) doc += `${co.coPhone}\n`
  if (co.coEmail) doc += `${co.coEmail}\n`
  if (co.license) doc += `License #: ${co.license}\n`
  doc += `\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  doc += `ESTIMATE / PROPOSAL\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  doc += `Estimate No.: ${d.estimateNum}\n`
  doc += `Date: ${today()}\n`
  doc += `Valid Through: ${expiry}\n\n`
  doc += `PREPARED FOR:\n`
  doc += `${d.customerName}\n`
  if (d.customerAddress) doc += `${d.customerAddress}\n`
  if (d.customerPhone) doc += `${d.customerPhone}\n`
  if (d.customerEmail) doc += `${d.customerEmail}\n`
  doc += `\nPROJECT SITE:\n${d.projectAddress || d.customerAddress || ''}\n\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  doc += `SCOPE OF WORK\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  doc += `${d.scope}\n\n`
  if (d.exclusions) {
    doc += `EXCLUSIONS:\n${d.exclusions}\n\n`
  }
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  doc += `PRICING\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  doc += `Total Estimate:    ${fmtM(d.price)}\n`
  if (d.depositAmount) {
    doc += `Materials Deposit: ${fmtM(d.depositAmount)} (due at acceptance, non-refundable once materials ordered)\n`
    doc += `Balance Due:       ${fmtM((d.price || 0) - (d.depositAmount || 0))} (due upon completion)\n`
  }
  doc += `\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  doc += `TERMS & CONDITIONS\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  doc += `1. ESTIMATE VALIDITY. This estimate is valid for the period stated above. Material and labor costs are subject to change after expiration. A new estimate will be required if this one expires.\n\n`
  doc += `2. MATERIALS DEPOSIT. Upon acceptance, a materials deposit is required before any materials will be ordered or work will begin. This deposit is non-refundable once materials have been ordered or custom-fabricated.\n\n`
  doc += `3. NOT A CONTRACT. This document is an estimate only and does not constitute a binding contract. A separate Residential Construction Contract must be executed by both parties before work commences.\n\n`
  doc += `4. SCOPE CHANGES. Any changes to the scope of work described above will require a written Change Order before any additional work is performed.\n\n`
  doc += `5. CONCEALED CONDITIONS. This estimate is based on conditions visible and reasonably ascertainable at the time of estimate. Concealed or unknown conditions that materially differ may require adjustment.\n\n`
  if (d.notes) {
    doc += `ADDITIONAL NOTES:\n${d.notes}\n\n`
  }
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  doc += `ACCEPTANCE\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  doc += `By signing below, Customer accepts this estimate and authorizes ${co.coName || 'Contractor'} to proceed in accordance with the scope of work described above, subject to execution of a formal Residential Construction Contract.\n\n`
  doc += `CUSTOMER SIGNATURE: ___________________________ Date: ____________\n\n`
  doc += `Print Name: ____________________________________________________\n\n`
  doc += `This acceptance does not constitute a binding contract. A Residential Construction Contract will be prepared and must be fully executed before work begins.\n`

  return doc
}

export function generateLienWaiverText(d, settings = {}) {
  const co = settings
  const state = d.projectState || 'SC'

  let doc = `${co.coName || 'PROLINE RESIDENTIAL LLC'}\n\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  doc += `FINAL UNCONDITIONAL LIEN WAIVER AND RELEASE\n`
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  doc += `Date: ${today()}\n`
  doc += `Project: ${d.projectAddress}\n`
  doc += `Customer: ${d.customerName}\n`
  doc += `Contract No.: ${d.contractNum || '—'}\n`
  doc += `Final Payment Amount: ${fmtM(d.finalPaymentAmount)}\n\n`
  doc += `WAIVER AND RELEASE:\n\n`
  doc += `Upon receipt of the final payment amount stated above, ${co.coName || 'Contractor'} (the "Undersigned") does hereby unconditionally and irrevocably waive, release, and discharge any and all lien rights, claims, or rights of action against the above-referenced project, the real property on which it is located, and the Owner thereof, arising out of or related to labor performed, materials furnished, or services rendered by the Undersigned in connection with the improvement of the real property.\n\n`
  doc += `The Undersigned represents and warrants that:\n\n`
  doc += `(a) The Undersigned has been paid in full for all labor, materials, and services provided in connection with the project through the date hereof;\n\n`
  doc += `(b) All subcontractors, suppliers, and materialmen employed or engaged by the Undersigned in connection with the project have been paid in full or will be paid in full from the proceeds of the final payment;\n\n`
  doc += `(c) This waiver is freely and voluntarily given in consideration of the final payment stated above, receipt of which is hereby acknowledged;\n\n`
  doc += `(d) This waiver is effective upon the Undersigned's actual receipt of the final payment in cleared funds.\n\n`
  doc += `This Lien Waiver and Release is given pursuant to and in accordance with the lien statutes of the State of ${state === 'SC' ? 'South Carolina' : state === 'NC' ? 'North Carolina' : state === 'GA' ? 'Georgia' : state === 'TN' ? 'Tennessee' : 'Virginia'}.\n\n`
  doc += `CONTRACTOR:\n\n`
  doc += `${co.coName || 'Proline Residential LLC'}\n\n`
  doc += `Authorized Signatory: ___________________________ Date: ____________\n\n`
  doc += `Print Name & Title: ____________________________________________________\n\n`
  doc += `NOTARIZATION (if required by state):\n\n`
  doc += `State of ______________, County of ______________\n\n`
  doc += `Subscribed and sworn before me this _______ day of _____________, 20_____.\n\n`
  doc += `Notary Public: ___________________________ Commission Expires: ____________\n`

  return doc
}
