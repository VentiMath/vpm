import React from "react";
import { createRoot } from "react-dom/client";
import * as api from "form-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { scenario } from "./scenario.cjs";
window.formVariant = __VARIANT__;
window.runForms = () => scenario(React, createRoot, api, zodResolver, z);
