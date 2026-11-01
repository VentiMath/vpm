import * as React from 'react';
import * as core from 'vtanstack-query-core';
import {createBindings} from './bindings.js';
export * from 'vtanstack-query-core';
export const {QueryClientContext, QueryClientProvider, useQueryClient, useQuery, useMutation} = createBindings(React, core);
