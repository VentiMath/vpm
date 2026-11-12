import dates = require("vdate-fns");
import { addDays } from "vdate-fns/addDays";
import { enUS } from "vdate-fns/locale/en-US";
const s: string = dates.format(addDays(new Date(), 1), "P", { locale: enUS });
void s;
