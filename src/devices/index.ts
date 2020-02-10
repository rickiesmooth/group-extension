const on = {
  name: "on",
  value: false,
  metadata: {
    title: "On/Off",
    type: "boolean",
    "@type": "OnOffProperty"
  }
};

const colorTemperature = {
  name: "colorTemperature",
  value: 0,
  metadata: {
    title: "Color Temperature",
    type: "number",
    "@type": "ColorTemperatureProperty",
    unit: "kelvin",
    minimum: 0,
    maximum: 1
  }
};

const level = {
  name: "level",
  value: 0,
  metadata: {
    title: "Level",
    type: "number",
    "@type": "BrightnessProperty",
    unit: "percent",
    minimum: 0,
    maximum: 100,
    readOnly: false
  }
};

const dimmableLight = {
  type: "dimmableLight",
  "@context": "https://iot.mozilla.org/schemas",
  "@type": ["OnOffSwitch", "Light", "ColorControl"],
  name: "Virtual Dimmable Color Light",
  properties: [level, colorTemperature, on],
  actions: [],
  events: [
    {
      name: "turnedOn",
      metadata: {
        "@type": "TurnedOnEvent",
        description: "Pulse transitioned from off to on"
      }
    },
    {
      name: "turnedOff",
      metadata: {
        "@type": "TurnedOffEvent",
        description: "Pulse transitioned from on to off"
      }
    }
  ]
};

export const allProperties = { level, colorTemperature, on };

export const virtualSwitches = [dimmableLight];
