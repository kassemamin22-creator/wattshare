import { beforeEach, describe, expect, it } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import i18n from "../i18n";
import ar from "../i18n/locales/ar.json";
import en from "../i18n/locales/en.json";
import { getApiErrorMessage, translateErrorDetail } from "./apiError";

const FALLBACK = "Something went wrong";

function apiError(detail: unknown, status = 400): AxiosError {
  const response = { data: { detail }, status, statusText: "", headers: {}, config: {} } as unknown as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, response);
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("getApiErrorMessage", () => {
  it("returns a string detail directly", () => {
    expect(getApiErrorMessage(apiError("Subscription already exists"), FALLBACK)).toBe(
      "Subscription already exists"
    );
  });

  it("joins the msg fields of a list detail (422 validation errors)", () => {
    const detail = [
      { loc: ["body", "phone"], msg: "Value error, Phone number must be in the format +961XXXXXXXX" },
      { loc: ["body", "email"], msg: "value is not a valid email address" },
    ];

    expect(getApiErrorMessage(apiError(detail, 422), FALLBACK)).toBe(
      "Phone number must be in the format +961XXXXXXXX; value is not a valid email address"
    );
  });

  it("falls back when a list detail has no usable msg fields", () => {
    expect(getApiErrorMessage(apiError([{ loc: ["body"] }], 422), FALLBACK)).toBe(FALLBACK);
  });

  it("returns the translated message for an object with a known error code", () => {
    const error = apiError({ code: "invalid_credentials", message: "Invalid email or password" }, 401);

    expect(getApiErrorMessage(error, FALLBACK)).toBe(en.errors.invalid_credentials);
  });

  it("translates the same error code into the active language", async () => {
    await i18n.changeLanguage("ar");
    const error = apiError({ code: "invalid_credentials", message: "Invalid email or password" }, 401);

    expect(getApiErrorMessage(error, FALLBACK)).toBe(ar.errors.invalid_credentials);
  });

  it("falls back to detail.message when the error code has no translation", () => {
    const error = apiError({ code: "some_new_code", message: "The backend's English text" });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("The backend's English text");
  });

  it("falls back to the generic message when an unknown code comes with no message", () => {
    expect(getApiErrorMessage(apiError({ code: "some_new_code" }), FALLBACK)).toBe(FALLBACK);
  });

  it("falls back to the generic message when the response has no detail", () => {
    expect(getApiErrorMessage(apiError(undefined, 500), FALLBACK)).toBe(FALLBACK);
  });

  it("falls back to the generic message for a network error with no response", () => {
    expect(getApiErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"), FALLBACK)).toBe(FALLBACK);
  });

  it("falls back to the generic message for anything that is not an axios error", () => {
    expect(getApiErrorMessage(new Error("boom"), FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});

describe("translateErrorDetail", () => {
  it("returns null for details that are not an object with a code", () => {
    expect(translateErrorDetail("plain string")).toBeNull();
    expect(translateErrorDetail([{ msg: "list item" }])).toBeNull();
    expect(translateErrorDetail(undefined)).toBeNull();
    expect(translateErrorDetail({ message: "no code here" })).toBeNull();
  });

  it("translates every error code that ships in the translation files", () => {
    for (const [code, text] of Object.entries(en.errors)) {
      expect(translateErrorDetail({ code, message: "ignored" })).toBe(text);
    }
  });
});
