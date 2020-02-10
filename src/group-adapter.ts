import { Adapter, Device, Property, Database } from "gateway-addon";
import {
  WebThingsClient as WTClient,
  Device as IDevice
} from "webthings-client";
import {
  client as WebSocketClient,
  connection as Connection,
  IMessage
} from "websocket";
import { virtualSwitches } from "./devices";

const DEFAULT_TYPE = virtualSwitches[0]["type"];

export type Group = {
  title: string;
  id: string;
  devices: string[];
  type?: string;
};

export type Grouponfig = {
  groups: Record<string, Group>;
};

const enum MessageTypes {
  PROPERTY_STATUS = "propertyStatus"
}

type Message = {
  id: string;
  messageType: MessageTypes;
  data: Record<string, unknown>;
};

const externalToInternalId = (href: string) =>
  href.split("/things/").pop() || "";

export class GroupAdapter extends Adapter<GDevice> {
  private connection: Connection | null = null;
  private db: Database<Grouponfig>;
  private config = {} as Grouponfig;
  public accessToken = "";
  public availableFollowerDevices = {} as Record<string, Device & IDevice>;

  constructor(addonManager: any, manifest: any) {
    super(addonManager, manifest.name, manifest.name);
    addonManager.addAdapter(this);

    this.db = new Database(manifest.name);
    this.accessToken = manifest.moziot.config.accessToken;

    const ws = new WebSocketClient();
    ws.connect(`ws://localhost:8080/things?jwt=${this.accessToken}`);
    ws.on("connect", connection => {
      this.connection = connection;
      connection.on("message", this.handleWsMessage);
    });

    Promise.all([
      this.db.open().then(() => this.db.loadConfig()),
      WTClient.local(this.accessToken).then(client => client.getDevices())
    ]).then(([config, discoveredFollowerDevices]) => {
      this.config = {
        ...config,
        groups: config.groups || {}
      };
      for (const key in discoveredFollowerDevices) {
        const discovered = discoveredFollowerDevices[key] as Device & IDevice;
        const id = externalToInternalId(discovered.id);
        this.availableFollowerDevices[id] = discovered;
      }
      for (const groupKey in config.groups) {
        const group = new GroupDevice(this, config.groups[groupKey]);
        this.handleDeviceAdded(group);
      }
    });
  }

  handleWsMessage = (m: IMessage) => {
    const message: Message = JSON.parse(m.utf8Data!);
    const groupDevice = this.devices[message.id];
    if (!groupDevice) return;

    switch (message.messageType) {
      case MessageTypes.PROPERTY_STATUS:
        // in case there are multiple properties updated
        for (const key in message.data) {
          if (groupDevice.properties.get(key)) {
            this.updateFollowerDeviceProperty(
              groupDevice.groupProperties[key],
              { [key]: message.data[key] }
            );
          }
        }
        break;
      default:
        break;
    }
  };

  updateFollowerDeviceProperty = (
    groupProperty: GDevice["groupProperties"][keyof GDevice["groupProperties"]],
    payload: Message["data"]
  ) => {
    groupProperty
      // flatten groupProps
      .reduce(
        (all, { followerDevices }) => [...all, ...followerDevices],
        [] as string[]
      )
      .forEach(id => {
        const data = {
          messageType: "setProperty",
          id,
          data: payload
        };

        if (!this.connection) throw new Error("no connection!");
        this.connection.send(JSON.stringify(data));
      });
  };

  addNewGroup({ id, title, devices, type = DEFAULT_TYPE }: Group) {
    return new Promise<Device>((resolve, reject) => {
      if (id in this.devices) {
        reject(`Device: ${id} already exists.`);
      } else {
        const groupConfig = {
          id,
          title,
          type,
          devices: devices.map(externalToInternalId)
        };
        console.log("ADDING NEW GROUP", groupConfig);
        const device = new GroupDevice(this, groupConfig);
        this.config.groups[id] = groupConfig;
        this.db.saveConfig(this.config);
        this.handleDeviceAdded(device);
        resolve(device);
      }
    });
  }

  removeGroup(deviceId: string) {
    return new Promise((resolve, reject) => {
      const device = this.devices[deviceId];
      if (device) {
        delete this.config.groups[deviceId];
        this.db.saveConfig(this.config);
        this.handleDeviceRemoved(device);
        resolve(device);
      } else {
        reject(`Device: ${deviceId} not found.`);
      }
    });
  }

  startPairing(_timeoutSeconds: number) {
    console.log(`GroupAdapter: ${this.name} id ${this.id} pairing started`);
  }

  cancelPairing() {
    console.log(`GroupAdapter: ${this.name} id ${this.id} pairing cancelled`);
  }

  removeAll() {
    for (const key in this.devices) {
      this.removeGroup(this.devices[key].id);
    }
  }
}

type DeviceProps = Device["properties"][keyof Device["properties"]] & {
  uid: string;
  followerDevices: string[];
};

interface GDevice extends Device {
  groupProperties: Record<string, DeviceProps[]>;
}

export class GroupDevice extends Device implements GDevice {
  public groupProperties = {} as Record<string, DeviceProps[]>;
  constructor(public adapter: GroupAdapter, public groupConfig: Group) {
    super(adapter, groupConfig.id);
    this.name = groupConfig.title;
    this["type"] = groupConfig.type!;

    groupConfig.devices.forEach(this.initializeDevice);
  }

  initializeDevice = (deviceId: string) => {
    console.log("INITIALIZE: deviceId", deviceId);
    console.log(
      "INITIALIZE: followerDevice",
      this.adapter.availableFollowerDevices[deviceId]
    );
    console.log(
      "AVAILABLE FOLLOWERDEVICES",
      this.adapter.availableFollowerDevices
    );
    const device = this.adapter.availableFollowerDevices[deviceId];

    if (!device) throw Error("Device not found!");
    const id = externalToInternalId(device.id);
    for (const key in device.properties) {
      const targetProperty = device.properties[key];
      const { minimum = 0, maximum = 1, type } = targetProperty;
      const uid = `${type}-${minimum}-${maximum}`;

      if (!this.groupProperties[key]) {
        const virtualProp = virtualSwitches[0].properties.find(
          ({ metadata }) => metadata["@type"] === targetProperty["@type"]
        );
        this.groupProperties[key] = [];
        if (virtualProp) {
          const prop = new Property(this, key, virtualProp.metadata);
          this.properties.set(key, prop);
        } else {
          console.log(
            `no metadata type metadata["@type"] for ${targetProperty["@type"]}`
          );
        }
      }

      const currentGroupProperty = this.groupProperties[key];
      const index = currentGroupProperty.findIndex(props => props.uid === uid);

      index > -1
        ? currentGroupProperty[index].followerDevices.push(id)
        : currentGroupProperty.push({
          ...targetProperty,
          followerDevices: [id],
          uid
        } as any);
    }
  };

  asDict() {
    const dict = super.asDict();
    dict.groupConfig = this.groupConfig;
    return dict;
  }
}

export class GroupProperty extends Property {
  private value: unknown;

  constructor(public device: Device, name: string, propertyDescr: unknown) {
    super(device, name, propertyDescr);
    this.onValue = !this.value;
  }

  setValue(value: unknown) {
    return new Promise<unknown>(resolve => {
      if (value !== this.value) {
        // value is changing
        this.setCachedValue(value);
        this.device.notifyEvent(this);
      }

      resolve(this.value);
      this.device.notifyPropertyChanged(this);
    });
  }
}
