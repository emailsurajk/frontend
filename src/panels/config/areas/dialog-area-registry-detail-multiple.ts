import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import { mdiPencil } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import "../../../components/ha-textfield";
import { AreaRegistryMultipleEntryMutableParams,AreaRegistryEntryMutableParams } from "../../../data/area_registry";
import { showAliasesDialog } from "../../../dialogs/aliases/show-dialog-aliases";
import { CropOptions } from "../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { AreaRegistryDetailMultipleDialogParams } from "./show-dialog-area-registry-detail";

const cropOptions: CropOptions = {
  round: false,
  type: "image/jpeg",
  quality: 0.75,
  aspectRatio: 1.78,
};

class DialogAreaDetailMultiple extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _noofenrtry_tocreate!: number;

  @state() private _no_start_from!: number;

  @state() private _aliases!: string[];

  @state() private _picture!: string | null;

  @state() private _error?: string;

  @state() private _params?: AreaRegistryDetailMultipleDialogParams;

  @state() private _submitting?: boolean;

  public async showDialog(
    params: AreaRegistryDetailMultipleDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry ? this._params.entry.name : "";
    this._noofenrtry_tocreate=this._params.entry? this._params.entry.no_of_area_tocreate:1;
    this._no_start_from=this._params.entry?this._params.entry.no_start_from:0;
    //this._aliases = this._params.entry ? this._params.entry.aliases : [];
    //this._picture = this._params.entry?.picture || null;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const entry = this._params.entry;
    const nameInvalid = !this._isNameValid();
    const noStartFromInvalid = !this._isNoStartFromValid();
    const noOfRequiredInvalid = !this._isNoOfRequiredValid();
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          entry
            ? entry.name
            : this.hass.localize("ui.panel.config.areas.editor.default_name")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            

            <ha-textfield
              .value=${this._name}
              @input=${this._nameChanged}
              .label=${this.hass.localize("ui.panel.config.areas.editor.name")}
              .errorMessage=${this.hass.localize(
                "ui.panel.config.areas.editor.name_required"
              )}
              .invalid=${nameInvalid}
              dialogInitialFocus
            ></ha-textfield>
            
            <ha-textfield
            .value=${this._no_start_from}
            @input=${this._no_start_from_Changed}
            .label=${this.hass.localize("ui.panel.config.areas.editor.no_start_from")}
            .errorMessage=${this.hass.localize(
              "ui.panel.config.areas.editor.no_start_from_required"
            )}
            .invalid=${noStartFromInvalid}
            dialogInitialFocus
            ></ha-textfield>

            <ha-textfield
              .value=${this._noofenrtry_tocreate}
              @input=${this._no_of_entryChanged}
              .label=${this.hass.localize("ui.panel.config.areas.editor.no_of_entry_tocreate")}
              .errorMessage=${this.hass.localize(
                "ui.panel.config.areas.editor.no_of_entry_tocreate_required"
              )}
              .invalid=${noOfRequiredInvalid}
              dialogInitialFocus
            ></ha-textfield>

            
          </div>
        </div>

        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${nameInvalid || this._submitting}
        >
          ${entry
            ? this.hass.localize("ui.panel.config.areas.editor.update")
            : this.hass.localize("ui.panel.config.areas.editor.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }


  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _isNoStartFromValid() {
    return  this._no_start_from >=0;
  }

  private _isNoOfRequiredValid() {
    return this._noofenrtry_tocreate>=1;
  }


  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _no_of_entryChanged(ev) {
    this._error = undefined;
    this._noofenrtry_tocreate = ev.target.value;
  }

  private _no_start_from_Changed(ev) {
    this._error = undefined;
    this._no_start_from = ev.target.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      for(var i = 0; i < parseInt(this._noofenrtry_tocreate+""); i++){
         var no=parseInt(this._no_start_from+"")+i
        const values: AreaRegistryEntryMutableParams = {
          name: this._name.trim()+"_"+(no)
        };
        await this._params!.createEntry!(values);
      }

      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.areas.editor.unknown_error");
    } finally {
      this._submitting = false;
    }
  }
/*
  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry!()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }
*/
  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-textfield {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-area-registry-detail-multiple": DialogAreaDetailMultiple;
  }
}

customElements.define("dialog-area-registry-detail-multiple", DialogAreaDetailMultiple);
