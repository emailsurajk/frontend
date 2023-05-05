import { mdiFilterRemove, mdiRefresh } from "@mdi/js";
import {
  addDays,
  differenceInHours,
  endOfToday,
  endOfWeek,
  endOfYesterday,
  startOfToday,
  startOfWeek,
  startOfYesterday,
} from "date-fns/esm";
import {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import { css, html, LitElement, PropertyValues } from "lit";
import { property, query, state } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import { LocalStorage } from "../../common/decorators/local-storage";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import {
  createSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { computeRTL } from "../../common/util/compute_rtl";
import { MIN_TIME_BETWEEN_UPDATES } from "../../components/chart/ha-chart-base";
import "../../components/chart/state-history-charts";
import type { StateHistoryCharts } from "../../components/chart/state-history-charts";
import "../../components/ha-circular-progress";
import "../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import "../../components/ha-target-picker";
import {
  AreaDeviceLookup,
  AreaEntityLookup,
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../data/area_registry";
import {
  DeviceEntityLookup,
  getDeviceEntityLookup,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import { subscribeEntityRegistry } from "../../data/entity_registry";
import {
  computeHistory,
  HistoryResult,
  subscribeHistory,
} from "../../data/history";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { haStyle } from "../../resources/styles";
import { HomeAssistant, Route } from "../../types";
import "../../components/ha-top-app-bar-fixed";
import "../../components/ha-icon-button-arrow-prev";

class HaPanelManagerDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @property() public route!: Route;

  @state() private _startDate: Date;

  @state() private _endDate: Date;

  @LocalStorage("historyPickedValue", true, false)
  private _targetPickerValue?: HassServiceTarget;

  @state() private _isLoading = false;

  @state() private _stateHistory?: HistoryResult;

  @state() private _ranges?: DateRangePickerRanges;

  @state() private _deviceEntityLookup?: DeviceEntityLookup;

  @state() private _areaEntityLookup?: AreaEntityLookup;

  @state() private _areaDeviceLookup?: AreaDeviceLookup;

  @state()
  private _showBack?: boolean;

  @query("state-history-charts")
  private _stateHistoryCharts?: StateHistoryCharts;

  private _subscribed?: Promise<UnsubscribeFunc>;

  private _interval?: number;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 1, 0, 0, 0);
    this._startDate = start;

    const end = new Date();
    end.setHours(end.getHours() + 2, 0, 0, 0);
    this._endDate = end;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._getHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._deviceEntityLookup = getDeviceEntityLookup(entities);
        this._areaEntityLookup = getAreaEntityLookup(entities);
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._areaDeviceLookup = getAreaDeviceLookup(devices);
      }),
    ];
  }

  private _goBack(): void {
    history.back();
  }

  private handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this._page) {
      navigate(`/developer-tools/${newPage}`);
    } else {
      scrollTo(0, 0);
    }
  }

  private get _page() {
    return this.route.path.substr(1);
  }

  protected render() {
    return html`
    <ha-top-app-bar-fixed>
    ${this._showBack
      ? html`
          <ha-icon-button-arrow-prev
            slot="navigationIcon"
            @click=${this._goBack}
          ></ha-icon-button-arrow-prev>
        `
      : html`
          <ha-menu-button
            slot="navigationIcon"
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ha-menu-button>
        `}
    <div slot="title">${this.hass.localize("panel.history")}</div>
    ${this._targetPickerValue
      ? html`
          <ha-icon-button
            slot="actionItems"
            @click=${this._removeAll}
            .disabled=${this._isLoading}
            .path=${mdiFilterRemove}
            .label=${this.hass.localize("ui.panel.history.remove_all")}
          ></ha-icon-button>
        `
      : ""}
    <ha-icon-button
      slot="actionItems"
      @click=${this._getHistory}
      .disabled=${this._isLoading || !this._targetPickerValue}
      .path=${mdiRefresh}
      .label=${this.hass.localize("ui.common.refresh")}
    ></ha-icon-button>

    <div class="row">
      <div class="column" >
       <div class="stat_area">
        <div class="stat_card">
            <div class="card">
                  <h3 class="card__title">Title
                  </h3>
                 
                  <div class="card__date">
                      April 15, 2022
                  </div>
                  <div class="card__arrow">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="15" width="15">
                          <path fill="#fff" d="M13.4697 17.9697C13.1768 18.2626 13.1768 18.7374 13.4697 19.0303C13.7626 19.3232 14.2374 19.3232 14.5303 19.0303L20.3232 13.2374C21.0066 12.554 21.0066 11.446 20.3232 10.7626L14.5303 4.96967C14.2374 4.67678 13.7626 4.67678 13.4697 4.96967C13.1768 5.26256 13.1768 5.73744 13.4697 6.03033L18.6893 11.25H4C3.58579 11.25 3.25 11.5858 3.25 12C3.25 12.4142 3.58579 12.75 4 12.75H18.6893L13.4697 17.9697Z"></path>
                      </svg>
                  </div>
              </div>
        </div>
        <div class="stat_card">
          <div class="card">
            <h3 class="card__title">Title
            </h3>
           
            <div class="card__date">
                April 15, 2022
            </div>
            <div class="card__arrow">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="15" width="15">
                    <path fill="#fff" d="M13.4697 17.9697C13.1768 18.2626 13.1768 18.7374 13.4697 19.0303C13.7626 19.3232 14.2374 19.3232 14.5303 19.0303L20.3232 13.2374C21.0066 12.554 21.0066 11.446 20.3232 10.7626L14.5303 4.96967C14.2374 4.67678 13.7626 4.67678 13.4697 4.96967C13.1768 5.26256 13.1768 5.73744 13.4697 6.03033L18.6893 11.25H4C3.58579 11.25 3.25 11.5858 3.25 12C3.25 12.4142 3.58579 12.75 4 12.75H18.6893L13.4697 17.9697Z"></path>
                </svg>
            </div>
          </div>
        </div>

        <div class="stat_card">
          <div class="card">
            <h3 class="card__title">Title
            </h3>
           
            <div class="card__date">
                April 15, 2022
            </div>
            <div class="card__arrow">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="15" width="15">
                    <path fill="#fff" d="M13.4697 17.9697C13.1768 18.2626 13.1768 18.7374 13.4697 19.0303C13.7626 19.3232 14.2374 19.3232 14.5303 19.0303L20.3232 13.2374C21.0066 12.554 21.0066 11.446 20.3232 10.7626L14.5303 4.96967C14.2374 4.67678 13.7626 4.67678 13.4697 4.96967C13.1768 5.26256 13.1768 5.73744 13.4697 6.03033L18.6893 11.25H4C3.58579 11.25 3.25 11.5858 3.25 12C3.25 12.4142 3.58579 12.75 4 12.75H18.6893L13.4697 17.9697Z"></path>
                </svg>
            </div>
          </div>
        </div>
       </div>
      </div>

      <div class="column" >
        <div class="flexi_card">
            <ha-target-picker
                .hass=${this.hass}
                .value=${this._targetPickerValue}
                .disabled=${this._isLoading}
                addOnTop
                @value-changed=${this._targetsChanged}
              ></ha-target-picker>
        </div>  
      </div>
    </div>

    <div class="header mdc-top-app-bar" style="background-color: var(--primary-color)">
      <paper-tabs
      scrollable
      attr-for-selected="page-name"
      .selected="yaml"
      @iron-activate=${this.handlePageSelected}
     >
      <paper-tab page-name="yaml">
        ${this.hass.localize("ui.panel.developer-tools.tabs.yaml.title")}
      </paper-tab>
      <paper-tab page-name="state">
        ${this.hass.localize("ui.panel.developer-tools.tabs.states.title")}
      </paper-tab>
      <paper-tab page-name="service">
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.services.title"
        )}
      </paper-tab>
      <paper-tab page-name="template">
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.templates.title"
        )}
      </paper-tab>
      <paper-tab page-name="event">
        ${this.hass.localize("ui.panel.developer-tools.tabs.events.title")}
      </paper-tab>
      <paper-tab page-name="statistics">
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.statistics.title"
        )}
      </paper-tab>
      </paper-tabs>
    </div>

    <div class="flex content">
      <div class="filters">
        <ha-date-range-picker
          .hass=${this.hass}
          ?disabled=${this._isLoading}
          .startDate=${this._startDate}
          .endDate=${this._endDate}
          .ranges=${this._ranges}
          @change=${this._dateRangeChanged}
        ></ha-date-range-picker>
        <ha-target-picker
          .hass=${this.hass}
          .value=${this._targetPickerValue}
          .disabled=${this._isLoading}
          addOnTop
          @value-changed=${this._targetsChanged}
        ></ha-target-picker>
      </div>
      ${this._isLoading
        ? html`<div class="progress-wrapper">
            <ha-circular-progress
              active
              alt=${this.hass.localize("ui.common.loading")}
            ></ha-circular-progress>
          </div>`
        : !this._targetPickerValue
        ? html`<div class="start-search">
            ${this.hass.localize("ui.panel.history.start_search")}
          </div>`
        : html`
            <state-history-charts
              .hass=${this.hass}
              .historyData=${this._stateHistory}
              .endTime=${this._endDate}
            >
            </state-history-charts>
          `}
    </div>
  </ha-top-app-bar-fixed>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    const today = new Date();
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);
    const weekStart = startOfWeek(today, { weekStartsOn });
    const weekEnd = endOfWeek(today, { weekStartsOn });

    this._ranges = {
      [this.hass.localize("ui.components.date-range-picker.ranges.today")]: [
        startOfToday(),
        endOfToday(),
      ],
      [this.hass.localize("ui.components.date-range-picker.ranges.yesterday")]:
        [startOfYesterday(), endOfYesterday()],
      [this.hass.localize("ui.components.date-range-picker.ranges.this_week")]:
        [weekStart, weekEnd],
      [this.hass.localize("ui.components.date-range-picker.ranges.last_week")]:
        [addDays(weekStart, -7), addDays(weekEnd, -7)],
    };

    const searchParams = extractSearchParamsObject();
    const entityIds = searchParams.entity_id;
    const deviceIds = searchParams.device_id;
    const areaIds = searchParams.area_id;
    if (entityIds || deviceIds || areaIds) {
      this._targetPickerValue = {};
    }
    if (entityIds) {
      const splitIds = entityIds.split(",");
      this._targetPickerValue!.entity_id = splitIds;
    }
    if (deviceIds) {
      const splitIds = deviceIds.split(",");
      this._targetPickerValue!.device_id = splitIds;
    }
    if (areaIds) {
      const splitIds = areaIds.split(",");
      this._targetPickerValue!.area_id = splitIds;
    }

    const startDate = searchParams.start_date;
    if (startDate) {
      this._startDate = new Date(startDate);
    }
    const endDate = searchParams.end_date;
    if (endDate) {
      this._endDate = new Date(endDate);
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    const searchParams = extractSearchParamsObject();
    if (searchParams.back === "1" && history.length > 1) {
      this._showBack = true;
      navigate(constructUrlCurrentPath(removeSearchParam("back")), {
        replace: true,
      });
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (
      this._targetPickerValue &&
      (changedProps.has("_startDate") ||
        changedProps.has("_endDate") ||
        changedProps.has("_targetPickerValue") ||
        (!this._stateHistory &&
          (changedProps.has("_deviceEntityLookup") ||
            changedProps.has("_areaEntityLookup") ||
            changedProps.has("_areaDeviceLookup"))))
    ) {
      this._getHistory();
    }

    if (!changedProps.has("hass") && !changedProps.has("_entities")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      this.rtl = computeRTL(this.hass);
    }
  }

  private _removeAll() {
    this._targetPickerValue = undefined;
    this._updatePath();
  }

  private async _getHistory() {
    if (!this._targetPickerValue) {
      return;
    }
    this._isLoading = true;
    const entityIds = this._getEntityIds();

    if (entityIds === undefined) {
      this._isLoading = false;
      this._stateHistory = undefined;
      return;
    }

    if (entityIds.length === 0) {
      this._isLoading = false;
      this._stateHistory = { line: [], timeline: [] };
      return;
    }

    if (this._subscribed) {
      this._unsubscribeHistory();
    }

    const now = new Date();

    this._subscribed = subscribeHistory(
      this.hass,
      (history) => {
        this._isLoading = false;
        this._stateHistory = computeHistory(
          this.hass,
          history,
          this.hass.localize
        );
      },
      this._startDate,
      this._endDate,
      entityIds
    );
    this._subscribed.catch(() => {
      this._isLoading = false;
      this._unsubscribeHistory();
    });
    if (this._endDate > now) {
      this._setRedrawTimer();
    }
  }

  private _setRedrawTimer() {
    clearInterval(this._interval);
    const now = new Date();
    const end = this._endDate > now ? now : this._endDate;
    const timespan = differenceInHours(this._startDate, end);
    this._interval = window.setInterval(
      () => this._stateHistoryCharts?.requestUpdate(),
      // if timespan smaller than 1 hour, update every 10 seconds, smaller than 5 hours, redraw every minute, otherwise every 5 minutes
      timespan < 2
        ? 10000
        : timespan < 10
        ? 60 * 1000
        : MIN_TIME_BETWEEN_UPDATES
    );
  }

  private _unsubscribeHistory() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  private _getEntityIds(): string[] | undefined {
    if (
      !this._targetPickerValue ||
      this._deviceEntityLookup === undefined ||
      this._areaEntityLookup === undefined ||
      this._areaDeviceLookup === undefined
    ) {
      return undefined;
    }

    const entityIds = new Set<string>();
    let {
      area_id: searchingAreaId,
      device_id: searchingDeviceId,
      entity_id: searchingEntityId,
    } = this._targetPickerValue;

    if (searchingAreaId) {
      searchingAreaId = ensureArray(searchingAreaId);
      for (const singleSearchingAreaId of searchingAreaId) {
        const foundEntities = this._areaEntityLookup[singleSearchingAreaId];
        if (foundEntities?.length) {
          for (const foundEntity of foundEntities) {
            if (foundEntity.entity_category === null) {
              entityIds.add(foundEntity.entity_id);
            }
          }
        }

        const foundDevices = this._areaDeviceLookup[singleSearchingAreaId];
        if (!foundDevices?.length) {
          continue;
        }

        for (const foundDevice of foundDevices) {
          const foundDeviceEntities = this._deviceEntityLookup[foundDevice.id];
          if (!foundDeviceEntities?.length) {
            continue;
          }

          for (const foundDeviceEntity of foundDeviceEntities) {
            if (
              (!foundDeviceEntity.area_id ||
                foundDeviceEntity.area_id === singleSearchingAreaId) &&
              foundDeviceEntity.entity_category === null
            ) {
              entityIds.add(foundDeviceEntity.entity_id);
            }
          }
        }
      }
    }

    if (searchingDeviceId) {
      searchingDeviceId = ensureArray(searchingDeviceId);
      for (const singleSearchingDeviceId of searchingDeviceId) {
        const foundEntities = this._deviceEntityLookup[singleSearchingDeviceId];
        if (!foundEntities?.length) {
          continue;
        }

        for (const foundEntity of foundEntities) {
          if (foundEntity.entity_category === null) {
            entityIds.add(foundEntity.entity_id);
          }
        }
      }
    }

    if (searchingEntityId) {
      searchingEntityId = ensureArray(searchingEntityId);
      for (const singleSearchingEntityId of searchingEntityId) {
        entityIds.add(singleSearchingEntityId);
      }
    }

    return [...entityIds];
  }

  private _dateRangeChanged(ev) {
    this._startDate = ev.detail.startDate;
    const endDate = ev.detail.endDate;
    if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setMilliseconds(endDate.getMilliseconds() - 1);
    }
    this._endDate = endDate;

    this._updatePath();
  }

  private _targetsChanged(ev) {
    this._targetPickerValue = ev.detail.value;
    this._updatePath();
  }

  private _updatePath() {
    const params: Record<string, string> = {};

    if (this._targetPickerValue) {
      if (this._targetPickerValue.entity_id) {
        params.entity_id = ensureArray(this._targetPickerValue.entity_id).join(
          ","
        );
      }
      if (this._targetPickerValue.area_id) {
        params.area_id = ensureArray(this._targetPickerValue.area_id).join(",");
      }
      if (this._targetPickerValue.device_id) {
        params.device_id = ensureArray(this._targetPickerValue.device_id).join(
          ","
        );
      }
    }

    if (this._startDate) {
      params.start_date = this._startDate.toISOString();
    }

    if (this._endDate) {
      params.end_date = this._endDate.toISOString();
    }
    console.log("here")
    
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding: 0 16px 16px;
          padding-bottom: max(env(safe-area-inset-bottom), 16px);
        }

        :host([virtualize]) {
          height: 100%;
        }

        .progress-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 16px;
        }

        .filters {
          display: flex;
          align-items: flex-start;
          margin-top: 16px;
        }

        ha-date-range-picker {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          max-width: 100%;
          direction: var(--direction);
        }

        @media all and (max-width: 1025px) {
          .filters {
            flex-direction: column;
          }
          ha-date-range-picker {
            margin-right: 0;
            margin-inline-end: 0;
            width: 100%;
          }
        }

        .start-search {
          padding-top: 16px;
          text-align: center;
          color: var(--secondary-text-color);
        }


      
      .column {
        float: left;
        width: 50%;
        padding: 5px;

        box-sizing: border-box;
      }
      
      .row:after {
        content: "";
        display: table;
        clear: both;
      }
      .stat_area:after {
        content: "";
        display: table;
        clear: both;
      }

      .stat_card {
        float: left;
        width: 33%;
        padding: 2px;
        box-sizing: border-box;
      }
      @media screen and (max-width: 600px) {
        .column {
          width: 100%;
        }
        .stat_card {
          width: 50%;
        }
      }
      @media screen and (max-width: 900px) {
       
        .stat_card {
          width: 33%;
        }
      }




      .flexi_card{
        --border-radius: 0.75rem;
        --primary-color: #7257fa;
        --secondary-color: #3c3852;
        font-family: "Arial";
        padding: 1rem;
        cursor: pointer;
        border-radius: var(--border-radius);
        background: #f1f1f3;
        box-shadow: 0px 8px 16px 0px rgb(0 0 0 / 3%);
        position: relative;
      }


      .card {
        --border-radius: 0.75rem;
        --primary-color: #03a9f4;
        --secondary-color: #3c3852;
        font-family: "Arial";
        padding: 1rem;
        cursor: pointer;
        border-radius: var(--border-radius);
        background: #f1f1f3;
        box-shadow: 0px 8px 16px 0px rgb(0 0 0 / 3%);
        position: relative;
      }
      
      .card > * + * {
        margin-top: 1.1em;
      }
      
      .card .card__content {
        color: var(--secondary-color);
        font-size: 0.86rem;
      }
      
      .card .card__title {
        padding: 0;
        font-size: 1.3rem;
        font-weight: bold;
      }
      
      .card .card__date {
        color: #6e6b80;
        font-size: 0.8rem;
      }
      
      .card .card__arrow {
        position: absolute;
        background: var(--primary-color);
        padding: 0.4rem;
        border-top-left-radius: var(--border-radius);
        border-bottom-right-radius: var(--border-radius);
        bottom: 0;
        right: 0;
        transition: 0.2s;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .card svg {
        transition: 0.2s;
      }
      
      /* hover */
      .card:hover .card__title {
        color: var(--primary-color);
        text-decoration: underline;
      }
      
      .card:hover .card__arrow {
        background: #111;
      }
      
      .card:hover .card__arrow svg {
        transform: translateX(3px);
      }

      /*tabs */



      paper-tabs {
        margin-left: max(env(safe-area-inset-left), 24px);
        margin-right: max(env(safe-area-inset-right), 24px);
        --paper-tabs-selection-bar-color: var(
          --app-header-selection-bar-color,
          var(--app-header-text-color, #fff)
        );
        text-transform: uppercase;
      }
      `,
    ];
  }
}

customElements.define("ha-panel-manager_dashboard", HaPanelManagerDashboard);

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-manager_dashboard": HaPanelManagerDashboard;
  }
}
