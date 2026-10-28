/** View-only Quest menu pagination. Hidden actions must not be ray-targetable. */
export const WORKSHOP_PAGE_SIZE=12;
export function workshopPageCount(total){
  if(!Number.isInteger(total)||total<0||total>256)throw Error('Invalid workshop actions.');
  return Math.max(1,Math.ceil(total/WORKSHOP_PAGE_SIZE));
}
export function workshopPageIndices(total,page){
  const count=workshopPageCount(total);
  if(!Number.isInteger(page)||page<0||page>=count)throw Error('Invalid workshop page.');
  const start=page*WORKSHOP_PAGE_SIZE;
  return Array.from({length:Math.min(WORKSHOP_PAGE_SIZE,total-start)},(_,i)=>start+i);
}
export function wrapWorkshopPage(page,delta,total){
  const pages=workshopPageCount(total);
  if(!Number.isInteger(page)||!Number.isInteger(delta))throw Error('Invalid page command.');
  return ((page+delta)%pages+pages)%pages;
}
