/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

declare module "gateway-addon" {
  interface IGroupDevice extends Device {
    groupProperties: Record<string, any[]>;
  }
  class Device {
    constructor(adapter: Adapter<unknown>, id: string);

    protected "@context": string;
    protected name: string;
    protected description: string;
    protected type: string;
    protected ["@type"]: string;

    public id: string;
    public addAction(name: string, metadata: any): void;
    public asThing(): Device;
    public asDict(): Record<string, any>;
    public notifyEvent(p: Property): void;
    public notifyPropertyChanged(p: Property): void;
    public properties: Map<string, Property>;
  }

  class Property {
    constructor(device: Device, name: string, propertyDescr: unknown);
    protected onValue: unknown;
    protected setCachedValue(val: unknown): void;

    public title: string;
    public type: string;
    public ["@type"]: string;
    public unit: string;
    public minimum?: number;
    public maximum?: number;
  }
  class Event {}

  class Adapter<T> {
    constructor(addonManager: any, id: string, packageName: string);
    protected devices: Record<string, T>;
    protected name: string;
    protected id: string;

    public handleDeviceAdded(device: Device): void;
    public handleDeviceRemoved(device: Device): void;
    public getDevices(): [Device];
    public addDevice(device: Device): Promise<Device>;
  }

  class Database<C> {
    constructor(packageName: string, path?: string);
    public open(): Promise<void>;
    public loadConfig(): Promise<C>;
    public saveConfig(config: C): Promise<void>;
  }

  class APIHandler {
    constructor(packageName: string, path?: string);
    public packageName: string;
    public unloading: boolean;
  }

  class APIResponse {
    constructor(config: {
      status: number;
      contentType?: string;
      content?: string;
    });
  }
}
