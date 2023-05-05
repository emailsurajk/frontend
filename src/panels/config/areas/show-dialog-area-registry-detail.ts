import { fireEvent } from "../../../common/dom/fire_event";
import {
  AreaRegistryEntry,
  AreaRegistryEntryMutableParams,
  AreaRegistryMultipleEntryMutableParams
} from "../../../data/area_registry";

export interface AreaRegistryDetailDialogParams {
  entry?: AreaRegistryEntry;
  createEntry?: (values: AreaRegistryEntryMutableParams) => Promise<unknown>;
  updateEntry?: (
    updates: Partial<AreaRegistryEntryMutableParams>
  ) => Promise<unknown>;
  removeEntry?: () => Promise<boolean>;
}


export interface AreaRegistryDetailMultipleDialogParams {
  entry?: AreaRegistryMultipleEntryMutableParams;
  createEntry?: (values: AreaRegistryEntryMutableParams) => Promise<unknown>;
}
export const loadAreaRegistryDetailDialog = () =>
  import("./dialog-area-registry-detail");

const loadAreaRegistryDetailDialogMultiple = () =>
  import("./dialog-area-registry-detail-multiple");

export const showAreaRegistryDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: AreaRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-area-registry-detail",
    dialogImport: loadAreaRegistryDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};

export const showAreaRegistryDetailForMultipleDialog = (
  element: HTMLElement,
  systemLogDetailParams: AreaRegistryDetailMultipleDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-area-registry-detail-multiple",
    dialogImport: loadAreaRegistryDetailDialogMultiple,
    dialogParams: systemLogDetailParams,
  });
};
