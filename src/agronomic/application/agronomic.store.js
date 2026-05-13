/**
 * Application service store for the `Agronomic` bounded context.
 * It coordinates plots, telemetry, weather, and yield forecast use cases and keeps a UI-facing state.
 *
 * @module useAgronomicStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { AgronomicApi } from "../infrastructure/agronomic-api.js";
import { PlotAssembler } from "../infrastructure/plot.assembler.js";

import { Plot } from "../domain/model/plot.entity.js";
import {DateTimeFormatter} from "../../shared/infrastructure/date-time.formatter.js";
import {AgronomicAnalysisAssembler} from "../infrastructure/agronomic-analysis.assembler.js";

const agronomicApi = new AgronomicApi();

/**
 * Reactive store that exposes Agronomic commands and queries.
 *
 * @returns {Object} Store state and actions.
 */
export const useAgronomicStore = defineStore('agronomic', () => {
    /**
     * List of plot entities.
     * @type {import('vue').Ref<Plot[]>}
     */
    const plots = ref([]);


    /**
     * Selected plot identifier for the independent Analysis Module.
     * Can be 'all' or a numeric plot ID.
     * @type {import('vue').Ref<string|number>}
     */
    const analysisPlotId = ref('all');

    /**
     * Selected time range span for the historical analysis.
     * Options: '7days', '30days', 'campaign'.
     * @type {import('vue').Ref<string>}
     */
    const analysisTimeRange = ref('30days');

    /**
     * Pre-calculated analysis data fetched from the backend.
     * @type {import('vue').Ref<import('../domain/model/agronomic-analysis.entity.js').AgronomicAnalysis|null>}
     */
    const analysisData = ref(null);

    /**
     * Whether the analysis data is currently being fetched.
     * @type {import('vue').Ref<boolean>}
     */
    const analysisLoading = ref(false);


    /**
     * Currently selected plot identifier for detailed overview.
     * @type {import('vue').Ref<number|string|null>}
     */
    const selectedPlotId = ref(null);

    /**
     * Number of loaded plots.
     * @type {import('vue').ComputedRef<number>}
     */
    const plotsCount = computed(() => {
        return plotsLoaded.value ? plots.value.length : 0;
    });

    /**
     * List of errors encountered during API operations.
     * @type {import('vue').Ref<Error[]>}
     */
    const errors = ref([]);

    /**
     * Whether plots have been loaded from the API.
     * @type {import('vue').Ref<boolean>}
     */
    const plotsLoaded = ref(false);

    /**
     * Returns the full Plot entity based on the current selected ID.
     * @type {import('vue').ComputedRef<Plot|null>}
     */
    const selectedPlot = computed(() => {
        return plots.value.find(p => p.id === selectedPlotId.value) || null;
    });

    /**
     * Time elapsed since the last update of the selected plot.
     * @type {import('vue').ComputedRef<string>}
     */
    const selectedPlotTimeElapsed = computed(() => {
        return DateTimeFormatter.formatRelativeTime(selectedPlot.value?.lastUpdate);
    });

    /**
     * Computed property that prepares analysis data for the PrimeVue Chart component.
     * Transforms backend analysis entities into Chart.js compatible data objects.
     * @type {import('vue').ComputedRef<Object>}
     */
    const analysisChartData = computed(() => {
        if (!analysisData.value) return { labels: [], datasets: [] };

        return {
            labels: analysisData.value.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'NDVI Index',
                    backgroundColor: '#2E4A3A',
                    hoverBackgroundColor: '#2E4A3A',
                    data: analysisData.value.ndviSeries,
                    yAxisID: 'yNDVI',
                    borderRadius: 4,
                    barThickness: 20
                },
                {
                    type: 'line',
                    label: 'Chill Portions (CP)',
                    borderColor: '#5B8DEF',
                    borderWidth: 3,
                    fill: false,
                    data: analysisData.value.cpSeries,
                    yAxisID: 'yCP',
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#5B8DEF'
                },
                {
                    type: 'line',
                    label: 'Threshold',
                    borderColor: '#FF8080',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    data: analysisData.value.cpSeries.map(() => analysisData.value.threshold),
                    yAxisID: 'yCP'
                }
            ]
        };
    });

    /**
     * Loads plots from infrastructure and updates the application state.
     * @returns {void}
     */
    function fetchPlots() {
        errors.value = [];
        agronomicApi.getPlots().then(response => {
            plots.value = PlotAssembler.toEntitiesFromResponse(response);
            plotsLoaded.value = true;
            if (plots.value.length > 0 && !selectedPlotId.value) {
                selectedPlotId.value = plots.value[0].id;
            }
        }).catch(error => {
            console.error("Error loading plots:", error);
            errors.value.push(error);
        });
    }

    /**
     * Updates the selected plot identifier.
     * @param {number|string} id - Plot identifier.
     */
    function selectPlot(id) {
        selectedPlotId.value = id;
    }

    /**
     * Updates the plot filter for the analysis chart and triggers a data refresh.
     * @param {string|number} id - Plot identifier or 'all'.
     */
    function setAnalysisPlot(id) {
        analysisPlotId.value = id;
        fetchAnalysisStatistics();
    }

    /**
     * Updates the time range for the analysis chart and triggers a data refresh.
     * @param {string} range - Time span ('7days', '30days', 'campaign').
     */
    function setAnalysisTimeRange(range) {
        analysisTimeRange.value = range;
        fetchAnalysisStatistics();
    }

    /**
     * Fetches pre-calculated agronomic statistics from the infrastructure layer.
     * Syncs the analysisData state with the backend response.
     */
    function fetchAnalysisStatistics() {
        analysisLoading.value = true;
        const params = {
            plotId: String(analysisPlotId.value),
            timeRange: analysisTimeRange.value
        };

        agronomicApi.getStatistics(params).then(response => {
            const data = response.data || response;
            const entities = AgronomicAnalysisAssembler.toEntitiesFromResponse(data);
            analysisData.value = entities.length > 0 ? entities[0] : null;
        }).catch(error => {
            console.error("Error fetching statistics:", error);
            errors.value.push(error);
            analysisData.value = null;
        }).finally(() => {
            analysisLoading.value = false;
        });
    }

    return {
        plots,
        selectedPlotId,
        selectedPlot,
        errors,
        plotsLoaded,
        fetchPlots,
        selectPlot,
        selectedPlotTimeElapsed,
        analysisPlotId,
        analysisTimeRange,
        analysisData,
        analysisLoading,
        setAnalysisPlot,
        setAnalysisTimeRange,
        fetchAnalysisStatistics,
        analysisChartData
    };
});

export default useAgronomicStore;