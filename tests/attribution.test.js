import { test } from "node:test";
import assert from "node:assert/strict";
import { landingPageviewProps, readLandingAttribution } from "../src/analytics/attribution.js";

test("readLandingAttribution omits empty referrer and UTMs", () => {
  assert.deepEqual(readLandingAttribution({ referrer: "", search: "" }), {});
});

test("readLandingAttribution parses referrer host", () => {
  assert.deepEqual(
    readLandingAttribution({ referrer: "https://www.pcgames.de/article", search: "" }),
    {
      referrer: "https://www.pcgames.de/article",
      referrer_host: "www.pcgames.de",
    },
  );
});

test("readLandingAttribution parses UTM query params", () => {
  assert.deepEqual(
    readLandingAttribution({
      referrer: "",
      search: "?utm_source=pcgames&utm_medium=article&utm_campaign=tower",
    }),
    {
      utm_source: "pcgames",
      utm_medium: "article",
      utm_campaign: "tower",
    },
  );
});

test("readLandingAttribution combines referrer and UTMs", () => {
  const props = readLandingAttribution({
    referrer: "https://reddit.com/r/gothic",
    search: "?utm_source=reddit",
  });
  assert.equal(props.referrer_host, "reddit.com");
  assert.equal(props.utm_source, "reddit");
});

test("landingPageviewProps maps referrer fields for Web Analytics", () => {
  const attribution = readLandingAttribution({
    referrer: "https://www.reddit.com/r/gothic",
    search: "?utm_source=reddit",
  });
  assert.deepEqual(landingPageviewProps(attribution, { locale: "en" }), {
    referrer: "https://www.reddit.com/r/gothic",
    referrer_host: "www.reddit.com",
    utm_source: "reddit",
    $referrer: "https://www.reddit.com/r/gothic",
    $referring_domain: "www.reddit.com",
    locale: "en",
  });
});
