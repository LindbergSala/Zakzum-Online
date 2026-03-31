import * as itemCatalogData from "@/data/items/catalog";
import { validateItemCatalogData } from "@/data/validation";

validateItemCatalogData(itemCatalogData);

export const { ITEM_CATALOG, ITEM_CATALOG_MAP } = itemCatalogData;
