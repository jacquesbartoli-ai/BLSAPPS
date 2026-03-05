import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear.js";

dayjs.extend(weekOfYear);

export function buildProductionLotNumber(receptionDate: Date, productionDate: Date) {
  const receptionWeek = String(dayjs(receptionDate).week()).padStart(2, "0");
  const receptionYear2 = String(dayjs(receptionDate).year()).slice(-2);
  const productionDay = String(dayjs(productionDate).date()).padStart(2, "0");
  const productionWeek = String(dayjs(productionDate).week()).padStart(2, "0");

  return `${receptionWeek}${receptionYear2}${productionDay}${productionWeek}`;
}
