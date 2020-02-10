/**
 * index.js - Loads the example API handler.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

import { GroupAPIHandler } from "./group-api-handler";
import { GroupAdapter } from "./group-adapter";

module.exports = (addonManager: any, manifest: any) => {
  const groupAdapter = new GroupAdapter(addonManager, manifest);
  new GroupAPIHandler(addonManager, groupAdapter, manifest);
};
