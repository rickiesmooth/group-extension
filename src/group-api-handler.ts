"use strict";
import crypto from "crypto";
import { APIHandler, APIResponse } from "gateway-addon";
import { IncomingHttpHeaders } from "http";
import { GroupAdapter, Group } from "./group-adapter";
import { virtualSwitches } from "./devices";

export class GroupAPIHandler extends APIHandler {
  private adapter: GroupAdapter;
  private groupTypes: string[];

  constructor(addonManager: any, adapter: GroupAdapter, manifest: any) {
    super(addonManager, manifest.name);
    addonManager.addAPIHandler(this);

    this.adapter = adapter;
    this.groupTypes = virtualSwitches.map(({ type }) => type);
    this.unloading = false;
  }

  handleGroupsResponse = (content: unknown) => {
    return new APIResponse({
      status: 200,
      contentType: "application/json",
      content: JSON.stringify(content)
    });
  };

  handleGroupsRequest = async (request: IncomingHttpHeaders) => {
    switch (request.method) {
      case "POST":
        const id = crypto.randomBytes(16).toString("hex");
        const newGroup = { ...(request.body as Object), id } as Group;
        const addedGroup = await this.adapter.addNewGroup(newGroup);
        return this.handleGroupsResponse({ addedGroup: addedGroup.asThing() });
      case "GET":
        const currentDevices = Object.values(this.adapter.getDevices());
        return this.handleGroupsResponse({
          savedGroups: currentDevices.map(device => device.asThing()),
          availableGroupSwitches: this.groupTypes
        });
      case "DELETE":
        await this.adapter.removeAll();
        return this.handleGroupsResponse({
          savedGroups: {}
        });
      default:
        return new APIResponse({ status: 404 });
    }
  };

  handleRequest = async (req: IncomingHttpHeaders) => {
    switch (req.path) {
      case "/groups":
        return this.handleGroupsRequest(req);
      case "/group":
        return this.handleGroupsRequest(req);
      default:
        return new APIResponse({ status: 404 });
    }
  };
}
