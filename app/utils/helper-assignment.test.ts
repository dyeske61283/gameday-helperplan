import type { ZodType } from "zod";
import { describe, expect, it } from "vitest";
import z from "zod";

describe("assign helpers to slots with restrictions and reducing assignment count average", () => {
  it("dummy", () => {
    const schema: ZodType<Date, number> = z.number().int().positive().transform(millis => new Date(millis));

    const now = Date.now();

    const parsedNow = schema.parse(now);

    expect(now).toEqual(parsedNow.getTime());

    const unixTimestampToDateSchema: ZodType<Date, string> = z.iso.datetime().transform(millis => new Date(millis));

    const nowString = "2022-12-12T18:00:00.000Z";

    const parsedFromString = unixTimestampToDateSchema.parse(nowString);

    expect(nowString).toEqual(parsedFromString.toISOString());
  });
});
