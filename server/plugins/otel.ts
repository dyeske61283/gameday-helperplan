import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("helperplan", "1.0.0");

export const createdPlansCounter = meter.createCounter("helperplan.plans.created", {
  description: "The amount of created plans through the POST endpoint",
  unit: "1",
});

export const retrievedPlansCounter = meter.createCounter("helperplan.plans.retrieved", {
  description: "The amount of retrieved plans through the GET endpoint",
  unit: "1",
});

export default defineNitroPlugin((_nitroApp) => {
  // Metric initialization is handled through the module-level exports
});
