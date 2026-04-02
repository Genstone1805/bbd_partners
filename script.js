// Global state
let orderData = {
  orderType: "",
  depot: "",
  department: "",
  garment: "",
  garmentPrice: 0,
  decoration: "",
  decorationPrice: 0,
  logo: "",
  decorationName: "",
  nameApprovalChecked: false,
  decorationDepartment: "",
  personalizationItems: [],
  selectedSize: "",
  selectedSizeMetric: "",
  selectedQuantity: 1,
  totalGarmentPrice: 0,
  shipping: "",
  shippingPrice: 0,
  shippingDetails: {
    unitNumber: "",
    streetNumber: "",
    streetAddress1: "",
    streetAddress2: "",
    suburb: "",
    state: "",
    postcode: "",
  },
};

const CART_STORAGE_KEY = "garmentOrderCart";
const JACKET_GARMENTS = new Set([
  "premium-unisex-tech-jacket-2xl-5xl",
  "mens-olympus-softshell-jacket-s-8xl",
  "ladies-olympus-softshell-jacket-8-26",
]);
const POLO_GARMENTS = new Set([
  "mens-polo-xs-5xl",
  "mens-polo-5xl-10xl",
  "womens-polo-20-26",
  "womens-polo-xs-2xl",
]);
const ROW_BASED_DEPARTMENT_DECORATIONS = new Set([
  "name-only",
  "dept-only",
  "dept-name",
]);

function loadCartFromSessionStorage() {
  const sessionCart = sessionStorage.getItem(CART_STORAGE_KEY);
  if (sessionCart) {
    try {
      return JSON.parse(sessionCart) || [];
    } catch {
      return [];
    }
  }

  // One-time migration from old localStorage cart to sessionStorage.
  const localCart = localStorage.getItem(CART_STORAGE_KEY);
  if (localCart) {
    try {
      const parsed = JSON.parse(localCart) || [];
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(parsed));
      localStorage.removeItem(CART_STORAGE_KEY);
      return parsed;
    } catch {
      return [];
    }
  }

  return [];
}

// Order cart to store multiple orders (load from sessionStorage)
let orderCart = loadCartFromSessionStorage();
const SHIPPING_PRICES = {
  small: 15.5,
  medium: 18.0,
  large: 20.0,
  xl: 25.0,
  freight: 12.0,
};
let checkoutShippingData = {
  shipping: "",
  shippingPrice: 0,
};
let stripePublishableKey = "";
let stripeConfigLoaded = false;
let stripe = null;
let stripeCardElement = null;
let pendingStripeCheckout = null;
let stripePaymentInProgress = false;
let stripeCheckoutRedirectInProgress = false;
const PENDING_STRIPE_CHECKOUT_KEY = "pendingStripeCheckout";
const PAYMENT_SUCCESS_WEBHOOK_ENDPOINT = "/api/payment-success-webhook";
const FORM_URLENCODED_UTF8_CONTENT_TYPE =
  "application/x-www-form-urlencoded; charset=UTF-8";
const DEFAULT_API_BASE_URL = "http://localhost:4242";
const API_BASE_URL =
  (typeof window.API_BASE_URL === "string" && window.API_BASE_URL.trim()) ||
  (window.location.port === "5500" ? DEFAULT_API_BASE_URL : "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function isJacketGarment(garment) {
  return JACKET_GARMENTS.has(garment);
}

function isPoloGarment(garment) {
  return POLO_GARMENTS.has(garment);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[match] || match;
  });
}

function decorationRequiresIndividualName(decoration = orderData.decoration) {
  return (
    decoration === "logo-name" ||
    decoration === "name-only" ||
    decoration === "dept-name"
  );
}

function decorationRequiresDepartment(decoration = orderData.decoration) {
  return decoration === "dept-only" || decoration === "dept-name";
}

function isRowBasedDepartmentMode(
  decoration = orderData.decoration,
  orderType = orderData.orderType,
) {
  return (
    orderType === "department" &&
    ROW_BASED_DEPARTMENT_DECORATIONS.has(decoration)
  );
}

function requiresRowEmbroideryName(
  decoration = orderData.decoration,
  orderType = orderData.orderType,
) {
  return (
    isRowBasedDepartmentMode(decoration, orderType) && decoration !== "dept-only"
  );
}

function getTotalQuantity(items = orderData.personalizationItems) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + (Math.max(parseInt(item?.quantity, 10) || 0, 0) || 0),
    0,
  );
}

function getAutomaticPriceTier(totalQuantity) {
  if (totalQuantity >= 100) {
    return "100+";
  }
  if (totalQuantity >= 50) {
    return "50-99";
  }
  if (totalQuantity >= 25) {
    return "25-49";
  }
  return "1-24";
}

function normalizePriceTierValue(priceTier) {
  const validTiers = ["1-24", "25-49", "50-99", "100+"];
  if (validTiers.includes(priceTier || "")) {
    return priceTier;
  }

  return (
    validTiers.find((tier) => String(priceTier || "").endsWith(tier)) || "1-24"
  );
}

function getGarmentIdsForDecoration(decoration) {
  return Object.keys(buildGarmentInfoMap()).filter((garmentId) =>
    getDecorationChoicesForGarment(garmentId).some(
      (option) => option.value === decoration,
    ),
  );
}

function getOrderGarmentIds(order = orderData) {
  const items = Array.isArray(order.personalizationItems)
    ? order.personalizationItems
    : [];
  const ids = Array.from(
    new Set(
      items
        .map((item) => item?.garment)
        .filter(Boolean),
    ),
  );

  if (ids.length > 0) {
    return ids;
  }
  return order.garment ? [order.garment] : [];
}

function getOrderGarmentSummary(order = orderData) {
  const garmentIds = getOrderGarmentIds(order);
  if (garmentIds.length === 0) {
    return "Not selected";
  }
  if (garmentIds.length === 1) {
    return getGarmentName(garmentIds[0]);
  }
  return `Mixed garments (${garmentIds.length} types)`;
}

function getPersonalizationItemsForReview(order = orderData) {
  if (
    Array.isArray(order.personalizationItems) &&
    order.personalizationItems.length > 0
  ) {
    return order.personalizationItems;
  }

  if (!order.garment && !order.selectedSize) {
    return [];
  }

  return [
    {
      id: "1",
      department: order.decorationDepartment || "",
      name: order.decorationName || "",
      garment: order.garment || "",
      size: order.selectedSize || "",
      quantity: Math.max(parseInt(order.selectedQuantity, 10) || 1, 1),
    },
  ];
}

function resolveGarmentUnitPrice(garmentId, size, priceTier) {
  const garmentInfo = buildGarmentInfoMap()[garmentId];
  if (!garmentInfo?.prices) {
    return 0;
  }

  const normalizedPriceTier = normalizePriceTierValue(priceTier);

  if (!garmentInfo.sizeRangePrices) {
    return garmentInfo.prices[normalizedPriceTier] || 0;
  }

  if (garmentId === "mens-olympus-softshell-jacket-s-8xl") {
    const sTo5xlSizes = ["S", "M", "L", "XL", "XXL", "3XL", "5XL"];
    const sixXlTo8xlSizes = ["6XL", "7XL", "8XL"];

    if (sTo5xlSizes.includes(size)) {
      return garmentInfo.sizeRangePrices["S-5XL"]?.[normalizedPriceTier] || 0;
    }
    if (sixXlTo8xlSizes.includes(size)) {
      return garmentInfo.sizeRangePrices["6XL-8XL"]?.[normalizedPriceTier] || 0;
    }
  }

  if (garmentId === "ladies-olympus-softshell-jacket-8-26") {
    const eightTo22Sizes = ["8", "10", "12", "14", "16", "18", "20", "22"];
    const twentyFourTo26Sizes = ["24", "26"];

    if (eightTo22Sizes.includes(size)) {
      return garmentInfo.sizeRangePrices["8-22"]?.[normalizedPriceTier] || 0;
    }
    if (twentyFourTo26Sizes.includes(size)) {
      return garmentInfo.sizeRangePrices["24-26"]?.[normalizedPriceTier] || 0;
    }
  }

  return garmentInfo.prices[normalizedPriceTier] || 0;
}

function getShippingFieldIds(prefix = "") {
  return {
    unitNumber: `${prefix}shippingUnitNumber`,
    streetNumber: `${prefix}shippingStreetNumber`,
    streetAddress1: `${prefix}shippingStreetAddress1`,
    streetAddress2: `${prefix}shippingStreetAddress2`,
    suburb: `${prefix}shippingSuburb`,
    state: `${prefix}shippingState`,
    postcode: `${prefix}shippingPostcode`,
  };
}

function readShippingDetailsFromForm(prefix = "") {
  const ids = getShippingFieldIds(prefix);
  return {
    unitNumber: document.getElementById(ids.unitNumber)?.value.trim() || "",
    streetNumber: document.getElementById(ids.streetNumber)?.value.trim() || "",
    streetAddress1:
      document.getElementById(ids.streetAddress1)?.value.trim() || "",
    streetAddress2:
      document.getElementById(ids.streetAddress2)?.value.trim() || "",
    suburb: document.getElementById(ids.suburb)?.value.trim() || "",
    state: document.getElementById(ids.state)?.value.trim() || "",
    postcode: document.getElementById(ids.postcode)?.value.trim() || "",
  };
}

function applyShippingDetailsToForm(details, prefix = "") {
  const ids = getShippingFieldIds(prefix);
  const normalized = details || {};
  const unitNumber = document.getElementById(ids.unitNumber);
  const streetNumber = document.getElementById(ids.streetNumber);
  const streetAddress1 = document.getElementById(ids.streetAddress1);
  const streetAddress2 = document.getElementById(ids.streetAddress2);
  const suburb = document.getElementById(ids.suburb);
  const state = document.getElementById(ids.state);
  const postcode = document.getElementById(ids.postcode);

  if (unitNumber) unitNumber.value = normalized.unitNumber || "";
  if (streetNumber) streetNumber.value = normalized.streetNumber || "";
  if (streetAddress1) streetAddress1.value = normalized.streetAddress1 || "";
  if (streetAddress2) streetAddress2.value = normalized.streetAddress2 || "";
  if (suburb) suburb.value = normalized.suburb || "";
  if (state) state.value = normalized.state || "";
  if (postcode) postcode.value = normalized.postcode || "";
}

function clearShippingDetailsInForm(prefix = "") {
  applyShippingDetailsToForm(
    {
      unitNumber: "",
      streetNumber: "",
      streetAddress1: "",
      streetAddress2: "",
      suburb: "",
      state: "",
      postcode: "",
    },
    prefix,
  );
}

function getSelectedDepotValue() {
  return document.getElementById("depot")?.value || "";
}

function getSelectedDepotLabel() {
  const depotSelect = document.getElementById("depot");
  if (!depotSelect || depotSelect.selectedIndex < 0) {
    return "";
  }

  return depotSelect.options[depotSelect.selectedIndex]?.text.trim() || "";
}

function parseShippingDetailsFromDepotValue(depotValue) {
  if (!depotValue || depotValue === "other") {
    return null;
  }

  const [streetValue = "", suburb = "", state = "", postcode = ""] =
    depotValue.split("|");
  const trimmedStreetValue = streetValue.trim();
  if (!trimmedStreetValue) {
    return null;
  }

  const streetMatch = trimmedStreetValue.match(
    /^(?:(?<unitNumber>[^/]+)\/)?(?<streetNumber>[0-9A-Z-]+)\s+(?<streetAddress1>.+)$/i,
  );
  const groups = streetMatch?.groups || {};

  return {
    unitNumber: groups.unitNumber?.trim() || "",
    streetNumber: groups.streetNumber?.trim() || "",
    streetAddress1: groups.streetAddress1?.trim() || trimmedStreetValue,
    streetAddress2: "",
    suburb: suburb.trim(),
    state: state.trim(),
    postcode: postcode.trim(),
  };
}

function updateShippingPrefillUI() {
  const hint = document.getElementById("shippingAddressPrefillHint");
  const prefillButton = document.getElementById("prefillShippingAddressBtn");
  const depotValue = getSelectedDepotValue();
  const depotLabel = getSelectedDepotLabel();
  const details = parseShippingDetailsFromDepotValue(depotValue);

  if (hint) {
    if (!depotValue) {
      hint.textContent =
        "Select a cost centre above to unlock address prefill, or enter the delivery details manually below.";
    } else if (depotValue === "other") {
      hint.textContent =
        "This cost centre does not have a saved address. Enter the delivery details manually below.";
    } else if (depotLabel) {
      hint.textContent = `${depotLabel} can be used to prefill the address below. You can still edit any field afterwards.`;
    } else {
      hint.textContent =
        "Use the selected cost centre to prefill the address below. You can still edit any field afterwards.";
    }
  }

  if (prefillButton) {
    prefillButton.disabled = !details;
  }
}

function prefillShippingAddressFromDepot() {
  const details = parseShippingDetailsFromDepotValue(getSelectedDepotValue());
  if (!details) {
    return;
  }

  applyShippingDetailsToForm(details);
  clearAddToCartErrors();
  renderLiveSummaryPanel();
}

function clearShippingAddressFields() {
  clearShippingDetailsInForm();
  clearAddToCartErrors();
  renderLiveSummaryPanel();
}

function formatShippingAddress(details) {
  if (!details) return "";
  return [
    details.unitNumber ? `Unit ${details.unitNumber}` : "",
    [details.streetNumber, details.streetAddress1].filter(Boolean).join(" "),
    details.streetAddress2,
    [details.suburb, details.state, details.postcode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function getDecorationChoicesForGarment(garment) {
  if (isJacketGarment(garment)) {
    return [
      {
        value: "no-personalisation",
        label: "No Personalisation (pre-decorated EE logo)",
      },
    ];
  }

  if (isPoloGarment(garment)) {
    return [
      {
        value: "no-personalisation",
        label: "No Personalisation (pre-decorated EE logo)",
      },
      { value: "logo-only", label: "Embroider - Logo only (RHC)" },
      {
        value: "logo-name",
        label: "Embroider - Logo + individual name (LHC)",
      },
      { value: "name-only", label: "Embroider - Individual name only (RHC)" },
      { value: "dept-only", label: "Embroider - Department name only" },
      {
        value: "dept-name",
        label: "Embroider - Individual name & department",
      },
    ];
  }

  return [
    {
      value: "no-personalisation",
      label: "No Personalisation (pre-decorated EE logo)",
    },
    { value: "logo-only", label: "Embroider - Logo only (RHC)" },
    {
      value: "logo-name",
      label: "Embroider - Logo + individual name (LHC)",
    },
    { value: "name-only", label: "Embroider - Individual name only (RHC)" },
    { value: "dept-only", label: "Embroider - Department name only" },
    {
      value: "dept-name",
      label: "Embroider - Individual name & department",
    },
  ];
}

let activeAppDialog = null;

function resolveAppDialog(result) {
  if (!activeAppDialog) return;

  const { resolve, isConfirm, previousActiveElement } = activeAppDialog;
  activeAppDialog = null;

  const modal = document.getElementById("appDialogModal");
  if (modal) {
    modal.style.display = "none";
  }

  if (
    previousActiveElement &&
    typeof previousActiveElement.focus === "function"
  ) {
    previousActiveElement.focus();
  }

  if (isConfirm) {
    resolve(Boolean(result));
    return;
  }
  resolve();
}

function openAppDialog({
  title = "Notice",
  message = "",
  confirmText = "OK",
  cancelText = "Cancel",
  variant = "info",
  isConfirm = false,
} = {}) {
  const modal = document.getElementById("appDialogModal");
  const titleElement = document.getElementById("appDialogTitle");
  const messageElement = document.getElementById("appDialogMessage");
  const iconElement = document.getElementById("appDialogIcon");
  const confirmButton = document.getElementById("appDialogConfirmBtn");
  const cancelButton = document.getElementById("appDialogCancelBtn");

  if (
    !modal ||
    !titleElement ||
    !messageElement ||
    !iconElement ||
    !confirmButton ||
    !cancelButton
  ) {
    console.error("App dialog markup is missing.");
    return Promise.resolve(isConfirm ? false : undefined);
  }

  if (activeAppDialog) {
    resolveAppDialog(false);
  }

  titleElement.textContent = title;
  messageElement.textContent = message;
  confirmButton.textContent = confirmText;
  cancelButton.textContent = cancelText;
  cancelButton.style.display = isConfirm ? "inline-flex" : "none";

  const iconMap = {
    info: "i",
    success: "✓",
    warning: "!",
    error: "!",
  };
  iconElement.textContent = iconMap[variant] || iconMap.info;
  modal.setAttribute("data-variant", variant);
  modal.style.display = "block";

  return new Promise((resolve) => {
    activeAppDialog = {
      resolve,
      isConfirm,
      previousActiveElement: document.activeElement,
    };
    confirmButton.focus();
  });
}

function showAppAlert(message, options = {}) {
  return openAppDialog({
    title: options.title || "Notice",
    message,
    confirmText: options.confirmText || "OK",
    variant: options.variant || "info",
    isConfirm: false,
  });
}

function showAppConfirm(message, options = {}) {
  return openAppDialog({
    title: options.title || "Please Confirm",
    message,
    confirmText: options.confirmText || "Confirm",
    cancelText: options.cancelText || "Cancel",
    variant: options.variant || "warning",
    isConfirm: true,
  });
}

function initAppDialog() {
  const confirmButton = document.getElementById("appDialogConfirmBtn");
  const cancelButton = document.getElementById("appDialogCancelBtn");
  const modal = document.getElementById("appDialogModal");

  if (confirmButton) {
    confirmButton.addEventListener("click", () => resolveAppDialog(true));
  }
  if (cancelButton) {
    cancelButton.addEventListener("click", () => resolveAppDialog(false));
  }
  if (modal) {
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        resolveAppDialog(false);
      }
    });
  }
}

// Initialize cart on page load
function initCart() {
  updateCartBadge();
  renderCartDropdown();
}

// Save cart to sessionStorage
function saveCart() {
  sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(orderCart));
  updateCartBadge();
  renderCartDropdown();
}

// Update cart badge count
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  if (orderCart.length > 0) {
    badge.textContent = orderCart.length;
    badge.style.display = 'block';
  } else {
    badge.textContent = "0";
    badge.style.display = 'none';
  }
}

// Toggle cart drawer
function toggleCartDropdown() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;
  drawer.style.display = drawer.style.display === 'block' ? 'none' : 'block';
  if (drawer.style.display === 'block') {
    renderCartDropdown();
  }
}

function calculateOrderLineTotals(order) {
  const hasPersonalizationItems =
    Array.isArray(order.personalizationItems) &&
    order.personalizationItems.length > 0;
  const totalQuantity = hasPersonalizationItems
    ? getTotalQuantity(order.personalizationItems)
    : Math.max(parseInt(order.selectedQuantity, 10) || 1, 1);
  const garmentTotal =
    typeof order.totalGarmentPrice === "number"
      ? order.totalGarmentPrice
      : (order.garmentPrice || 0) * totalQuantity;
  const decorationTotal = (order.decorationPrice || 0) * totalQuantity;
  const shippingTotal = order.shippingPrice || 0;

  return {
    totalQuantity,
    garmentTotal,
    decorationTotal,
    shippingTotal,
    orderTotal: garmentTotal + decorationTotal + shippingTotal,
  };
}

function calculateCartTotal(sharedIndividualShippingPrice = 0) {
  const baseTotal = orderCart.reduce(
    (sum, order) => sum + calculateOrderLineTotals(order).orderTotal,
    0,
  );
  return baseTotal + sharedIndividualShippingPrice;
}

function renderCartMetaTotals(sharedIndividualShipping = 0) {
  const subtotal = calculateCartTotal(0);
  const grandTotal = subtotal + sharedIndividualShipping;

  const headerCartTotal = document.getElementById("headerCartTotal");
  if (headerCartTotal) {
    headerCartTotal.textContent = `$${subtotal.toFixed(2)}`;
  }

  const summaryCartCount = document.getElementById("summaryCartCount");
  if (summaryCartCount) {
    summaryCartCount.textContent = `${orderCart.length} item${orderCart.length === 1 ? "" : "s"}`;
  }

  const summaryCartSubtotal = document.getElementById("summaryCartSubtotal");
  if (summaryCartSubtotal) {
    summaryCartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  }
  const summarySharedShip = document.getElementById("summarySharedShip");
  if (summarySharedShip) {
    summarySharedShip.textContent = `$${sharedIndividualShipping.toFixed(2)}`;
  }
  const summaryCartGrand = document.getElementById("summaryCartGrand");
  if (summaryCartGrand) {
    summaryCartGrand.textContent = `$${grandTotal.toFixed(2)}`;
  }

  const summaryShippingNote = document.getElementById("summaryShippingNote");
  if (summaryShippingNote) {
    summaryShippingNote.textContent = "";
  }

  const drawerSub = document.getElementById("drawerSub");
  if (drawerSub) {
    drawerSub.textContent = `${orderCart.length} order${orderCart.length === 1 ? "" : "s"}`;
  }
  const drawerSubtotal = document.getElementById("drawerSubtotal");
  if (drawerSubtotal) {
    drawerSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  }
  const drawerSharedShip = document.getElementById("drawerSharedShip");
  if (drawerSharedShip) {
    drawerSharedShip.textContent = `$${sharedIndividualShipping.toFixed(2)}`;
  }
  const drawerGrandTotal = document.getElementById("drawerGrandTotal");
  if (drawerGrandTotal) {
    drawerGrandTotal.textContent = `$${grandTotal.toFixed(2)}`;
  }
  const drawerNote = document.getElementById("drawerNote");
  if (drawerNote) {
    drawerNote.textContent = "";
  }
}

function renderLiveSummaryPanel() {
  const mount = document.getElementById("liveSummaryLines");
  if (!mount) return;

  const hasDraft =
    !!orderData.orderType || !!orderData.garment || !!orderData.decoration;
  if (!hasDraft) {
    mount.innerHTML =
      '<div class="muted">Start building an order to see totals here.</div>';
    return;
  }

  collectPersonalizationData();
  const qty = getTotalQuantity(orderData.personalizationItems);
  const garmentTotal =
    typeof orderData.totalGarmentPrice === "number"
      ? orderData.totalGarmentPrice
      : (orderData.garmentPrice || 0) * qty;
  const decoTotal = (orderData.decorationPrice || 0) * qty;
  const shippingTotal = orderData.shippingPrice || 0;
  const draftTotal = garmentTotal + decoTotal + shippingTotal;

  mount.innerHTML = `
    <div class="summaryLine">
      <span class="summaryLine__k">Type</span>
      <span class="summaryLine__v">${orderData.orderType ? (orderData.orderType === "department" ? "Department" : "Individual") : "Not selected"}</span>
    </div>
    <div class="summaryLine">
      <span class="summaryLine__k">Garment</span>
      <span class="summaryLine__v">${escapeHtml(getOrderGarmentSummary(orderData))}</span>
    </div>
    <div class="summaryLine">
      <span class="summaryLine__k">Decoration</span>
      <span class="summaryLine__v">${escapeHtml(orderData.decoration ? getDecorationName(orderData.decoration) : "Not selected")}</span>
    </div>
    <div class="summaryLine">
      <span class="summaryLine__k">Qty</span>
      <span class="summaryLine__v">${qty || 0}</span>
    </div>
    <div class="summaryLine">
      <span class="summaryLine__k">Draft total</span>
      <span class="summaryLine__v">$${draftTotal.toFixed(2)}</span>
    </div>
  `;
}

// Render cart drawer + quick cart + summary totals
function renderCartDropdown() {
  const quickCartItems = document.getElementById("quickCartItems");
  const drawerItems = document.getElementById("drawerItems");

  if (!quickCartItems || !drawerItems) {
    return;
  }

  if (orderCart.length === 0) {
    quickCartItems.innerHTML = '<div class="muted">Your cart is empty.</div>';
    drawerItems.innerHTML = '<div class="muted">Your cart is empty.</div>';
    renderCartMetaTotals(0);
    renderLiveSummaryPanel();
    return;
  }

  let quickHtml = "";
  let drawerHtml = "";

  orderCart.forEach((order, index) => {
    const { totalQuantity, orderTotal } = calculateOrderLineTotals(order);
    const typeLabel = order.orderType === "department" ? "Department" : "Individual";
    const garmentSummary = getOrderGarmentSummary(order);
    const decorationSummary = getDecorationName(order.decoration);

    quickHtml += `
      <div class="quickItem">
        <div class="quickItem__top">
          <div class="quickItem__title">Order #${order.orderNumber} (${escapeHtml(typeLabel)})</div>
          <div class="money">$${orderTotal.toFixed(2)}</div>
        </div>
        <div class="quickItem__meta">
          <div>${escapeHtml(garmentSummary)}</div>
          <div>${escapeHtml(decorationSummary)}</div>
          <div>${totalQuantity} item(s)</div>
        </div>
        <div class="quickItem__actions">
          <button class="miniBtn" type="button" onclick="editOrderFromCart(${index})">Edit</button>
          <button class="miniBtn miniBtn--danger" type="button" onclick="removeFromCart(${index})">Delete</button>
        </div>
      </div>
    `;

    drawerHtml += `
      <div class="drawerItem">
        <div class="drawerItem__top">
          <div class="drawerItem__title">Order #${order.orderNumber} (${escapeHtml(typeLabel)})</div>
          <div class="money">$${orderTotal.toFixed(2)}</div>
        </div>
        <div class="drawerItem__meta">
          <div>${escapeHtml(garmentSummary)}</div>
          <div>${escapeHtml(decorationSummary)}</div>
          <div>${totalQuantity} item(s)</div>
        </div>
        <div class="quickItem__actions">
          <button class="miniBtn" type="button" onclick="editOrderFromCart(${index})">Edit</button>
          <button class="miniBtn miniBtn--danger" type="button" onclick="removeFromCart(${index})">Delete</button>
        </div>
      </div>
    `;
  });

  quickCartItems.innerHTML = quickHtml;
  drawerItems.innerHTML = drawerHtml;
  renderCartMetaTotals(0);
  renderLiveSummaryPanel();
}

// Approved departments list (from instructions)
const approvedDepartments = [
  "Asset and Operational Excellence",
  "Asset Engineering",
  "Assets & Operations Management",
  "Coastal Operations",
  "Commercial Design",
  "Commercial Services",
  "Contestable Network Solutions",
  "Contract Management Capability Program",
  "Customer & Commerical",
  "Design Services",
  "Devops",
  "Digital Asset Management",
  "Digital Delivery",
  "Digital Services",
  "Electric Vehicle Transition",
  "Electrical Safety Office",
  "Finance Division",
  "Fleet Team",
  "Frontline Mobility",
  "Future Networks",
  "Governance & Corporate Services",
  "Graduate Program",
  "Innovation Team",
  "Inventory & Logistics",
  "Learning & Capability",
  "Location + Midnorth Coast Operations",
  "Major Projects and Transmission",
  "Major Projects and Transmission Services",
  "Meter 2 Cash",
  "Midnorth Coast Operations",
  "MSM Team",
  "Murray Operations",
  "Network Design",
  "Network Development",
  "Network Investment and Maintenance",
  "Network Planning",
  "Network Planning and Development",
  "Network Services",
  "Network Substation and Design",
  "North West Operations",
  "Operational Services",
  "Operations",
  "Outage Management Group",
  "People & Safety",
  "People Operations and Planning",
  "Portfolio Services",
  "Procurement",
  "Property",
  "Riverina Slopes",
  "South Eastern Operations",
  "Strategy and Future Networks",
  "Telbu",
  "Transmission Services",
  "Vegatation Operations",
  "Works Delivery & Specilised Services",
  "Zone Substation Engineering",
  "Other (please note - you will need prior approval if your department is not listed)",
];

let currentSection = 1;
let personalizationCount = 0;

function setActiveSection(sectionNumber) {
  [1, 2, 3].forEach((index) => {
    const section = document.getElementById(`section${index}`);
    const step = document.getElementById(`step${index}`);
    if (section) {
      section.classList.toggle("section--active", index === sectionNumber);
    }
    if (step) {
      step.classList.toggle("step--active", index === sectionNumber);
    }
  });
  currentSection = sectionNumber;
}

// Section navigation
function nextSection(current) {
  if (current === 2) {
    const validationState = getSection2ValidationState();
    if (!validationState.isValid) {
      showAppAlert(validationState.errors[0], {
        title: "Step 2 Incomplete",
        variant: "warning",
      });
      return;
    }

    updateGarmentPriceBasedOnQuantity();
  }

  currentSection = current + 1;
  setActiveSection(currentSection);

  if (currentSection === 3) {
    generateOrderSummary();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function prevSection(current) {
  currentSection = current - 1;
  setActiveSection(currentSection);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Section 1: Order Type & Depot
function resetPerOrderShippingState() {
  orderData.shipping = "";
  orderData.shippingPrice = 0;
  orderData.shippingDetails = {
    unitNumber: "",
    streetNumber: "",
    streetAddress1: "",
    streetAddress2: "",
    suburb: "",
    state: "",
    postcode: "",
  };

  const deliveryNameSelect = document.getElementById("deliveryNameSelect");
  if (deliveryNameSelect) {
    deliveryNameSelect.value = "";
  }

  clearShippingDetailsInForm();
  updateShippingPrefillUI();

  document.querySelectorAll('input[name="shipping"]').forEach((input) => {
    input.checked = false;
    const option = input.closest(".shipOption");
    if (option) {
      option.classList.remove("shipOption--selected");
    }
  });
}

function updateSection3ShippingUI() {
  const departmentShippingFields = document.getElementById(
    "departmentShippingFields",
  );
  const individualShippingNotice = document.getElementById(
    "individualShippingNotice",
  );
  const hasOrderType =
    orderData.orderType === "department" || orderData.orderType === "individual";

  if (departmentShippingFields) {
    departmentShippingFields.style.display = hasOrderType ? "block" : "none";
  }
  if (individualShippingNotice) {
    individualShippingNotice.style.display = hasOrderType ? "block" : "none";
  }
}

function getPersonalizationRowSnapshot() {
  const rows = Array.from(document.querySelectorAll(".personalization-item"));
  if (rows.length === 0) {
    return Array.isArray(orderData.personalizationItems)
      ? orderData.personalizationItems.map((item) => ({
          id: item?.id || "",
          department: item?.department || "",
          name: item?.name || "",
          garment: item?.garment || "",
          size: item?.size || "",
          quantity: Math.max(parseInt(item?.quantity, 10) || 1, 1),
        }))
      : [];
  }

  return rows.map((row, index) => ({
    id: row.dataset.personId || `${index + 1}`,
    department: orderData.decorationDepartment || "",
    name: row.querySelector('[data-field="name"]')?.value.trim() || "",
    garment: row.querySelector('[data-field="garment"]')?.value || "",
    size: row.querySelector('[data-field="size"]')?.value || "",
    quantity: Math.max(
      parseInt(row.querySelector('[data-field="quantity"]')?.value, 10) || 1,
      1,
    ),
  }));
}

function buildGarmentOptionsMarkup(selectedGarment = "") {
  const garmentIds = isRowBasedDepartmentMode()
    ? getGarmentIdsForDecoration(orderData.decoration)
    : Object.keys(buildGarmentInfoMap());

  const options = garmentIds
    .map((garmentId) => {
      const selected = garmentId === selectedGarment ? ' selected' : "";
      return `<option value="${escapeHtml(garmentId)}"${selected}>${escapeHtml(getGarmentName(garmentId))}</option>`;
    })
    .join("");

  return `<option value="">Select garment...</option>${options}`;
}

function buildSizeOptionsMarkup(garmentId, selectedSize = "") {
  const sizes = buildGarmentInfoMap()[garmentId]?.sizes || [];
  const options = sizes
    .map((size) => {
      const selected = size === selectedSize ? ' selected' : "";
      return `<option value="${escapeHtml(size)}"${selected}>${escapeHtml(size)}</option>`;
    })
    .join("");

  return `<option value="">Select size...</option>${options}`;
}

function buildLegacyDepartmentRowMarkup(itemId, item = {}) {
  const nameValue = escapeHtml(item.name || "");
  const quantityValue = Math.max(parseInt(item.quantity, 10) || 1, 1);

  return `
    <div class="personalization-item" id="person-${itemId}" data-person-id="${itemId}">
      <div class="bulkRow">
        <input type="text" class="input" placeholder="Person / recipient name (optional)" data-field="name" value="${nameValue}">
        <input type="number" class="input" min="1" value="${quantityValue}" data-field="quantity">
        ${
          itemId > 1
            ? `<button class="miniBtn miniBtn--danger" type="button" onclick="removePersonalizationItem(${itemId})">Remove</button>`
            : `<span></span>`
        }
      </div>
    </div>
  `;
}

function buildRowBasedDepartmentRowMarkup(itemId, item = {}) {
  const showEmbroideryName = requiresRowEmbroideryName();
  const rowClass = showEmbroideryName
    ? "bulkRow bulkRow--lineItem"
    : "bulkRow bulkRow--lineItem bulkRow--no-name";
  const quantityValue = Math.max(parseInt(item.quantity, 10) || 1, 1);

  return `
    <div class="personalization-item" id="person-${itemId}" data-person-id="${itemId}">
      <div class="${rowClass}">
        ${
          showEmbroideryName
            ? `
              <div class="bulkCell">
                <label class="label required bulkRow__label">Embroidery: first name</label>
                <input type="text" class="input" placeholder="Required" data-field="name" value="${escapeHtml(item.name || "")}">
              </div>
            `
            : ""
        }
        <div class="bulkCell">
          <label class="label required bulkRow__label">Garment type</label>
          <select class="select" data-field="garment">
            ${buildGarmentOptionsMarkup(item.garment || "")}
          </select>
        </div>
        <div class="bulkCell">
          <label class="label required bulkRow__label">Size</label>
          <select class="select" data-field="size">
            ${buildSizeOptionsMarkup(item.garment || "", item.size || "")}
          </select>
        </div>
        <div class="bulkCell">
          <label class="label required bulkRow__label">Qty</label>
          <input type="number" class="input" min="1" value="${quantityValue}" data-field="quantity">
        </div>
        <div class="bulkCell bulkCell--actions">
          ${
            itemId > 1
              ? `<button class="miniBtn miniBtn--danger" type="button" onclick="removePersonalizationItem(${itemId})">Remove</button>`
              : `<span></span>`
          }
        </div>
      </div>
    </div>
  `;
}

function buildPersonalizationItemMarkup(itemId, item = {}) {
  if (isRowBasedDepartmentMode()) {
    return buildRowBasedDepartmentRowMarkup(itemId, item);
  }
  return buildLegacyDepartmentRowMarkup(itemId, item);
}

function renderPersonalizationItems(items = orderData.personalizationItems) {
  const container = document.getElementById("personalizationItems");
  if (!container) return;

  const normalizedItems =
    Array.isArray(items) && items.length > 0
      ? items
      : [
          {
            name: "",
            garment: "",
            size: "",
            quantity: 1,
          },
        ];

  personalizationCount = 0;
  container.innerHTML = normalizedItems
    .map((item) => {
      personalizationCount += 1;
      return buildPersonalizationItemMarkup(personalizationCount, item);
    })
    .join("");
}

function syncDepartmentBulkUI() {
  const bulkFields = document.getElementById("departmentBulkFields");
  const quantityField = document.getElementById("quantityField");
  const addPersonBtn = document.getElementById("addPersonBtn");
  const garmentSelectionField = document.getElementById("garmentSelectionField");
  const sizeSelectionGroup = document.getElementById("sizeSelectionGroup");
  const priceSelectionGroup = document.getElementById("priceSelectionGroup");
  const priceDisplayGroup = document.getElementById("priceDisplayGroup");
  const isDepartmentOrder = orderData.orderType === "department";
  const rowBasedMode = isRowBasedDepartmentMode();
  const garmentInfo = buildGarmentInfoMap()[orderData.garment];
  const currentItems = getPersonalizationRowSnapshot();

  if (bulkFields) {
    bulkFields.style.display = isDepartmentOrder ? "block" : "none";
  }

  if (garmentSelectionField) {
    garmentSelectionField.style.display = rowBasedMode ? "none" : "block";
  }

  if (sizeSelectionGroup) {
    sizeSelectionGroup.style.display =
      !rowBasedMode && garmentInfo?.sizes?.length ? "block" : "none";
  }

  if (priceSelectionGroup) {
    priceSelectionGroup.style.display =
      !rowBasedMode && garmentInfo?.prices ? "block" : "none";
  }

  if (priceDisplayGroup) {
    priceDisplayGroup.style.display =
      !rowBasedMode && typeof garmentInfo?.price === "number" ? "block" : "none";
  }

  if (quantityField) {
    quantityField.style.display = isDepartmentOrder ? "none" : "block";
  }

  if (!isDepartmentOrder) {
    const container = document.getElementById("personalizationItems");
    if (container) {
      container.innerHTML = "";
    }
    personalizationCount = 0;
    orderData.personalizationItems = [];
    if (addPersonBtn) {
      addPersonBtn.disabled = true;
    }
    validateSection2();
    return;
  }

  if (addPersonBtn) {
    addPersonBtn.disabled = false;
  }

  renderPersonalizationItems(currentItems);
  initializePersonalizationSection();
  validateSection2();
}

function updateDecorationOptionsForGarment(garment) {
  const select = document.getElementById("decorationSelect");
  if (!select) return;

  const options = getDecorationChoicesForGarment(garment);
  const previousValue = orderData.decoration || select.value;

  select.innerHTML = '<option value="">Select decoration...</option>';
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  });

  const canKeepPrevious = options.some((item) => item.value === previousValue);
  const selectedValue = canKeepPrevious
    ? previousValue
    : isJacketGarment(garment)
      ? "no-personalisation"
      : "";

  select.value = selectedValue;
  selectDecoration(selectedValue);
  select.disabled = isJacketGarment(garment);
}

function selectOrderType(type, element) {
  orderData.orderType = type;
  document.querySelectorAll('input[name="orderType"]').forEach((input) => {
    const card = input.closest(".choiceCard");
    if (card) {
      card.classList.remove("choiceCard--selected");
    }
  });
  if (element) {
    element.classList.add("choiceCard--selected");
  } else {
    const selectedInput = document.querySelector(
      `input[name="orderType"][value="${type}"]`,
    );
    const selectedCard = selectedInput?.closest(".choiceCard");
    if (selectedCard) {
      selectedCard.classList.add("choiceCard--selected");
    }
  }

  if (type === "department") {
    document.getElementById("deptSelectSection1").style.display = "block";
  } else {
    document.getElementById("deptSelectSection1").style.display = "none";
    document.getElementById("departmentSelect").value = "";
    orderData.department = "";
  }

  updateDecorationOptionsForGarment(
    type === "department"
      ? ""
      : document.getElementById("garmentSelect")?.value || "",
  );
  syncDepartmentBulkUI();
  updateSection3ShippingUI();
  updateFinalTotal();
  clearAddToCartErrors();
  validateSection1();
  renderLiveSummaryPanel();
}

function selectDepot() {
  const selectedValue = document.getElementById("depot").value;
  orderData.depot = selectedValue; // For individual orders, store as depot
  updateShippingPrefillUI();
  validateSection1();
}

function selectDepartment() {
  const selectedValue = document.getElementById("departmentSelect").value;
  orderData.department = selectedValue; // For department orders, store as department
  validateSection1();
}

function validateSection1() {
  let selectionMade = false;
  let deptSelected = true;

  if (orderData.orderType === "department") {
    // For department orders, check if a department is selected
    selectionMade = orderData.department && orderData.department !== "";
    deptSelected = selectionMade;
  } else {
    // For individual orders, check if a depot/cost centre is selected
    selectionMade = orderData.depot && orderData.depot !== "";
  }

  const isValid = !!(
    orderData.orderType &&
    selectionMade &&
    deptSelected
  );
  document.getElementById("next1").disabled = !isValid;
  return isValid;
}

// App wiring
document.addEventListener("DOMContentLoaded", async function () {
  initCart();
  initAppDialog();
  await loadStripeConfig();
  initStripe();
  await handleStripeCheckoutReturn();
  updateSection3ShippingUI();
  syncDepartmentBulkUI();
  setActiveSection(1);
  updateDecorationOptionsForGarment("");
  validateSection1();
  validateSection2();
  updateFinalTotal();
  updateShippingPrefillUI();
  renderLiveSummaryPanel();

  const sg = document.getElementById("viewSizeGuides");
  if (sg) {
    sg.addEventListener("click", function (e) {
      e.preventDefault();
      openSizeGuides();
    });
  }

  document
    .querySelectorAll('.choiceCard[data-choice="orderType"]')
    .forEach((card) => {
      card.addEventListener("click", function () {
        const value = card.dataset.value;
        const radio = card.querySelector('input[name="orderType"]');
        if (radio) {
          radio.checked = true;
        }
        selectOrderType(value, card);
      });
    });

  document.querySelectorAll('input[name="orderType"]').forEach((input) => {
    input.addEventListener("change", function () {
      selectOrderType(this.value);
    });
  });

  const depot = document.getElementById("depot");
  if (depot) {
    depot.addEventListener("change", function () {
      selectDepot();
      renderLiveSummaryPanel();
    });
  }

  const departmentSelect = document.getElementById("departmentSelect");
  if (departmentSelect) {
    departmentSelect.addEventListener("change", function () {
      selectDepartment();
      renderLiveSummaryPanel();
    });
  }

  const garmentSelect = document.getElementById("garmentSelect");
  if (garmentSelect) {
    garmentSelect.addEventListener("change", function () {
      selectGarment(this.value);
      renderLiveSummaryPanel();
    });
  }

  const sizeSelect = document.getElementById("sizeSelect");
  if (sizeSelect) {
    sizeSelect.addEventListener("change", function () {
      selectSize(this.value);
      renderLiveSummaryPanel();
    });
  }

  const sizeMetricSelect = document.getElementById("sizeMetricSelect");
  if (sizeMetricSelect) {
    sizeMetricSelect.addEventListener("change", function () {
      selectSizeMetric(this.value);
      renderLiveSummaryPanel();
    });
  }

  const quantityInput = document.getElementById("quantityInput");
  if (quantityInput) {
    quantityInput.addEventListener("input", function () {
      updateQuantity(this.value);
      renderLiveSummaryPanel();
    });
  }

  const priceTierSelect = document.getElementById("priceTierSelect");
  if (priceTierSelect) {
    priceTierSelect.addEventListener("change", function () {
      selectPriceTier(this.value);
      renderLiveSummaryPanel();
    });
  }

  const decorationSelect = document.getElementById("decorationSelect");
  if (decorationSelect) {
    decorationSelect.addEventListener("change", function () {
      selectDecoration(this.value);
      renderLiveSummaryPanel();
    });
  }

  const logoSelect = document.getElementById("logoSelect");
  if (logoSelect) {
    logoSelect.addEventListener("change", function () {
      selectLogo(this.value);
      renderLiveSummaryPanel();
    });
  }

  const nameInput = document.getElementById("decorationNameInput");
  if (nameInput) {
    nameInput.addEventListener("input", function () {
      saveDecorationName(this.value);
      renderLiveSummaryPanel();
    });
  }

  const approval = document.getElementById("nameApprovalChecked");
  if (approval) {
    approval.addEventListener("change", function () {
      saveNameApproval(this.checked);
      renderLiveSummaryPanel();
    });
  }

  const decorationDept = document.getElementById("decorationDeptSelect");
  if (decorationDept) {
    decorationDept.addEventListener("change", function () {
      saveDecorationDepartment(this.value);
      renderLiveSummaryPanel();
    });
  }

  const next1 = document.getElementById("next1");
  if (next1) {
    next1.addEventListener("click", function () {
      nextSection(1);
    });
  }

  const back2 = document.getElementById("back2");
  if (back2) {
    back2.addEventListener("click", function () {
      prevSection(2);
    });
  }

  const next2 = document.getElementById("next2");
  if (next2) {
    next2.addEventListener("click", function () {
      nextSection(2);
    });
  }

  const back3 = document.getElementById("back3");
  if (back3) {
    back3.addEventListener("click", function () {
      prevSection(3);
    });
  }

  const addToCartBtn = document.getElementById("addToCartBtn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", addToCart);
  }

  const step1 = document.getElementById("step1");
  if (step1) {
    step1.addEventListener("click", function () {
      setActiveSection(1);
    });
  }
  const step2 = document.getElementById("step2");
  if (step2) {
    step2.addEventListener("click", function () {
      if (validateSection1()) {
        setActiveSection(2);
      }
    });
  }
  const step3 = document.getElementById("step3");
  if (step3) {
    step3.addEventListener("click", function () {
      if (validateSection1() && !document.getElementById("next2").disabled) {
        generateOrderSummary();
        setActiveSection(3);
      }
    });
  }

  const cartBtn = document.getElementById("cartBtn");
  if (cartBtn) {
    cartBtn.addEventListener("click", function () {
      toggleCartDropdown();
    });
  }

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", checkout);
  }
  const drawerCheckoutBtn = document.getElementById("drawerCheckoutBtn");
  if (drawerCheckoutBtn) {
    drawerCheckoutBtn.addEventListener("click", checkout);
  }

  const clearCartBtn = document.getElementById("clearCartBtn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", clearCart);
  }
  const drawerClearBtn = document.getElementById("drawerClearBtn");
  if (drawerClearBtn) {
    drawerClearBtn.addEventListener("click", clearCart);
  }

  const confirmCheckoutBtn = document.getElementById("confirmCheckoutBtn");
  if (confirmCheckoutBtn) {
    confirmCheckoutBtn.addEventListener(
      "click",
      confirmCheckoutWithSharedShipping,
    );
  }
  const stripePayBtn = document.getElementById("stripePayBtn");
  if (stripePayBtn) {
    stripePayBtn.addEventListener("click", processStripePayment);
  }

  const deliveryNameSelect = document.getElementById("deliveryNameSelect");
  if (deliveryNameSelect) {
    deliveryNameSelect.addEventListener("input", function () {
      clearAddToCartErrors();
      renderLiveSummaryPanel();
    });
  }

  const prefillShippingAddressBtn = document.getElementById(
    "prefillShippingAddressBtn",
  );
  if (prefillShippingAddressBtn) {
    prefillShippingAddressBtn.addEventListener("click", function () {
      prefillShippingAddressFromDepot();
    });
  }

  const clearShippingAddressBtn = document.getElementById(
    "clearShippingAddressBtn",
  );
  if (clearShippingAddressBtn) {
    clearShippingAddressBtn.addEventListener("click", function () {
      clearShippingAddressFields();
    });
  }

  Object.values(getShippingFieldIds()).forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    input.addEventListener("input", function () {
      clearAddToCartErrors();
      renderLiveSummaryPanel();
    });
  });

  const confirmChecked = document.getElementById("confirmChecked");
  if (confirmChecked) {
    confirmChecked.addEventListener("change", clearAddToCartErrors);
  }

  document.querySelectorAll('input[name="shipping"]').forEach((input) => {
    input.addEventListener("change", function () {
      selectShipping(this.value, this.closest(".shipOption"));
      clearAddToCartErrors();
      renderLiveSummaryPanel();
    });
  });

  const addPersonBtn = document.getElementById("addPersonBtn");
  if (addPersonBtn) {
    addPersonBtn.addEventListener("click", function () {
      addPersonalizationItem();
      renderLiveSummaryPanel();
    });
  }

  const personalizationItemsContainer = document.getElementById(
    "personalizationItems",
  );
  if (personalizationItemsContainer) {
    const handleDynamicPersonalizationChange = function (event) {
      if (!event.target?.matches?.("[data-field]")) {
        return;
      }
      handlePersonalizationFieldChange(event.target);
    };

    personalizationItemsContainer.addEventListener(
      "input",
      handleDynamicPersonalizationChange,
    );
    personalizationItemsContainer.addEventListener(
      "change",
      handleDynamicPersonalizationChange,
    );
  }

  const checkoutDeliverySelect = document.getElementById(
    "checkoutDeliveryNameSelect",
  );
  if (checkoutDeliverySelect) {
    checkoutDeliverySelect.addEventListener(
      "input",
      clearCheckoutShippingErrors,
    );
  }

  const checkoutAddressInput = document.getElementById("checkoutShippingAddress");
  if (checkoutAddressInput) {
    checkoutAddressInput.addEventListener("input", clearCheckoutShippingErrors);
  }

  const checkoutShippingSelect = document.getElementById("checkoutShippingSelect");
  if (checkoutShippingSelect) {
    checkoutShippingSelect.addEventListener("change", function () {
      selectCheckoutShipping(this.value);
    });
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest('[data-close="drawer"]')) {
      const drawer = document.getElementById("cartDrawer");
      if (drawer) {
        drawer.style.display = "none";
      }
    }
    if (event.target.closest('[data-close="checkoutModal"]')) {
      closeCheckoutShippingModal();
    }
    if (event.target.closest('[data-close="paymentModal"]')) {
      closeStripePaymentModal();
    }
    if (event.target.closest('[data-close="appDialog"]')) {
      resolveAppDialog(false);
    }
  });
});

function getMeasurementEntries(garmentData) {
  if (!garmentData || !garmentData.measurements) return [];
  return Object.entries(garmentData.measurements).filter(
    ([, config]) =>
      Array.isArray(config?.values) &&
      Array.isArray(garmentData.sizes) &&
      config.values.length === garmentData.sizes.length,
  );
}

function populateSizeMetricOptions(garmentData) {
  const metricSelect = document.getElementById("sizeMetricSelect");
  if (!metricSelect) return;

  metricSelect.innerHTML = '<option value="">Select measurement...</option>';

  const entries = getMeasurementEntries(garmentData);
  entries.forEach(([key, config]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = config.label;
    metricSelect.appendChild(option);
  });

  metricSelect.value = "";
  orderData.selectedSizeMetric = "";
}

function populateSizeOptions(garmentData, metricKey = "") {
  const sizeSelect = document.getElementById("sizeSelect");
  if (!sizeSelect) return;

  sizeSelect.innerHTML = '<option value="">Select size...</option>';
  if (!garmentData || !Array.isArray(garmentData.sizes)) return;

  const measurement = metricKey ? garmentData.measurements?.[metricKey] : null;
  const hasMeasurementValues =
    Array.isArray(measurement?.values) &&
    measurement.values.length === garmentData.sizes.length;

  garmentData.sizes.forEach((sizeCode, index) => {
    const option = document.createElement("option");
    option.value = sizeCode;
    option.dataset.sizeCode = sizeCode;
    if (hasMeasurementValues) {
      option.textContent = `${measurement.values[index]} cm`;
    } else {
      option.textContent = sizeCode;
    }
    sizeSelect.appendChild(option);
  });
}

function selectSizeMetric(metricKey) {
  const garmentSelect = document.getElementById("garmentSelect");
  if (!garmentSelect) return;
  const garment = garmentSelect.value;
  if (!garment) return;

  const garmentInfo = buildGarmentInfoMap();
  const selectedGarmentInfo = garmentInfo[garment];
  if (!selectedGarmentInfo) return;

  const previousSize = orderData.selectedSize;
  orderData.selectedSizeMetric = metricKey || "";
  orderData.selectedSize = "";
  populateSizeOptions(selectedGarmentInfo, orderData.selectedSizeMetric);

  const sizeSelect = document.getElementById("sizeSelect");
  if (
    previousSize &&
    sizeSelect &&
    Array.from(sizeSelect.options).some((option) => option.value === previousSize)
  ) {
    sizeSelect.value = previousSize;
    orderData.selectedSize = previousSize;
  }

  validateSection2();
}

function buildGarmentInfoMap() {
  return {
    "mens-polo-xs-5xl": {
      name: "Mens Polo 1065",
      sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "5XL"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [49.5, 52, 54.5, 57, 59.5, 62, 64.5, 69.5],
        },
      },
    },
    "mens-polo-5xl-10xl": {
      name: "Mens Polo JB210 6XL +",
      sizes: ["6/7XL", "8/9XL", "10/11XL"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [80.5, 87.5, 94],
        },
      },
    },
    "womens-polo-xs-2xl": {
      name: "Ladies Polo JH201W",
      sizes: ["XS", "S", "M", "L", "XL", "2XL"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [43, 45.5, 48, 50.5, 53, 55.5],
        },
      },
    },
    "womens-polo-20-26": {
      name: "Ladies Polo 1165",
      sizes: ["6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [42, 44, 46.5, 49, 51.5, 54, 56.5, 59.5, 63, 66.5, 70],
        },
      },
    },
    "premium-unisex-tech-jacket-2xl-5xl": {
      name: "Podium Unisex Tech Jacket",
      sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [53.5, 56, 58.5, 61, 63.5, 66, 68.5, 71.5, 74.5, 77.5],
        },
        bodyLength: {
          label: "Body Length (cm)",
          values: [72, 74, 76, 78, 80, 82, 84, 85, 86, 87],
        },
      },
      prices: {
        "1-24": 93.0,
        "25-49": 88.35,
        "50-99": 86.0,
        "100+": 79.1,
      },
    },
    "mens-olympus-softshell-jacket-s-8xl": {
      name: "Mens Olympus Softshell Jacket",
      sizes: ["S", "M", "L", "XL", "XXL", "3XL", "5XL", "6XL", "7XL", "8XL"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [54, 56.5, 59, 61.5, 64, 66.5, 72.5, 75.5, 78.5, 81.5],
        },
        bodyLength: {
          label: "Body Length (cm)",
          values: [76, 78, 80, 82, 84, 86, 89, 90, 91, 92],
        },
      },
      prices: {
        "1-24": 68.0,
        "25-49": 64.5,
        "50-99": 62.9,
        "100+": 57.8,
      },
      sizeRangePrices: {
        "S-5XL": {
          "1-24": 68.0,
          "25-49": 64.5,
          "50-99": 62.9,
          "100+": 57.8,
        },
        "6XL-8XL": {
          "1-24": 73.5,
          "25-49": 69.85,
          "50-99": 68.0,
          "100+": 62.5,
        },
      },
    },
    "ladies-olympus-softshell-jacket-8-26": {
      name: "Ladies Olympus Softshell Jacket",
      sizes: ["8", "10", "12", "14", "16", "18", "20", "22", "24", "26"],
      measurements: {
        halfChest: {
          label: "Half Chest (cm)",
          values: [48, 50.5, 53, 55.5, 58, 60.5, 63, 65.5, 69.5, 73.5],
        },
        bodyLength: {
          label: "Body Length (cm)",
          values: [67.5, 69, 70.5, 72, 73.5, 75, 76, 77, 78, 79],
        },
      },
      prices: {
        "1-24": 73.5,
        "25-49": 69.85,
        "50-99": 68.0,
        "100+": 62.5,
      },
      sizeRangePrices: {
        "8-22": {
          "1-24": 68.0,
          "25-49": 64.5,
          "50-99": 62.9,
          "100+": 57.8,
        },
        "24-26": {
          "1-24": 73.5,
          "25-49": 69.85,
          "50-99": 68.0,
          "100+": 62.5,
        },
      },
    },
  };
}

// Section 2: Garment Selection
function selectGarment(garment) {
  orderData.garment = garment;
  orderData.selectedSize = "";
  orderData.selectedSizeMetric = "";

  const garmentInfo = buildGarmentInfoMap();

  // Store the selected garment info
  const selectedGarmentInfo = garmentInfo[garment];
  const sizeGroup = document.getElementById("sizeSelectionGroup");
  const sizeSelect = document.getElementById("sizeSelect");
  const sizeMetricSelect = document.getElementById("sizeMetricSelect");

  if (!selectedGarmentInfo) {
    orderData.garmentName = "";
    orderData.garmentSizes = [];
    orderData.garmentPrice = 0;
    orderData.totalGarmentPrice = 0;
    if (sizeSelect) {
      sizeSelect.innerHTML = '<option value="">Select size...</option>';
    }
    if (sizeMetricSelect) {
      sizeMetricSelect.innerHTML = '<option value="">Select measurement...</option>';
    }
    if (sizeGroup) {
      sizeGroup.style.display = "none";
    }
    updateDecorationOptionsForGarment("");
    validateSection2();
    updatePriceDisplay();
    return;
  }

  orderData.garmentName = selectedGarmentInfo.name;
  orderData.garmentSizes = selectedGarmentInfo.sizes || [];
  orderData.totalGarmentPrice = 0;
  orderData.selectedQuantity =
    parseInt(document.getElementById("quantityInput")?.value, 10) || 1;

  // Calculate price based on quantity (default to lowest tier initially)
  // Only set price if the garment has prices defined
  if (selectedGarmentInfo.prices) {
    orderData.garmentPrice = selectedGarmentInfo.prices["1-24"];
  } else {
    orderData.garmentPrice = 0; // Default to 0 if no prices defined
  }

  // Show size selection section and populate measurement + size options
  if (selectedGarmentInfo.sizes && selectedGarmentInfo.sizes.length > 0) {
    populateSizeOptions(selectedGarmentInfo, "");
    if (sizeGroup) {
      sizeGroup.style.display = "block";
    }
  } else {
    if (sizeGroup) {
      sizeGroup.style.display = "none";
    }
  }

  // Populate price tier options for the selected garment (only if prices exist)
  populatePriceTierOptions(selectedGarmentInfo);
  updateDecorationOptionsForGarment(garment);
  syncDepartmentBulkUI();

  // Update single-price display if applicable
  updatePriceDisplay();

  validateSection2();
}

// Function to populate price tier options for the selected garment
function populatePriceTierOptions(garmentInfo) {
  // If the garment has a single numeric `price`, show the single price field.
  if (typeof garmentInfo.price === "number") {
    document.getElementById("priceSelectionGroup").style.display = "none";
    document.getElementById("priceDisplayGroup").style.display = "block";
    orderData.garmentPrice = garmentInfo.price;
    updatePriceDisplay();
    return;
  }

  // If the garment has tiered `prices`, render the select input
  if (garmentInfo.prices) {
    document.getElementById("priceSelectionGroup").style.display = "block";
    document.getElementById("priceDisplayGroup").style.display = "none";

    const selectElement = document.getElementById("priceTierSelect");
    // Clear existing options except the first one
    selectElement.innerHTML =
      '<option value="">Select quantity tier...</option>';

    // Check if this garment has size-range specific pricing
    if (garmentInfo.sizeRangePrices) {
      // For garments with size-range pricing, add optgroups for each size range
      for (const [sizeRange, prices] of Object.entries(
        garmentInfo.sizeRangePrices,
      )) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = sizeRange;

        for (const [tier, price] of Object.entries(prices)) {
          const option = document.createElement("option");
          option.value = tier;
          option.textContent = `${tier} items: $${price.toFixed(2)} each`;
          optgroup.appendChild(option);
        }

        selectElement.appendChild(optgroup);
      }
    } else {
      // Add options for standard pricing tiers
      for (const [tier, price] of Object.entries(garmentInfo.prices)) {
        const option = document.createElement("option");
        option.value = tier;
        option.textContent = `${tier} items: $${price.toFixed(2)} each`;
        selectElement.appendChild(option);
      }
    }

    // Default to the lowest tier initially if available
    const defaultTier = Object.keys(garmentInfo.prices)[0];
    if (defaultTier) {
      document.getElementById("priceTierSelect").value = defaultTier;
      updateGarmentPriceWithTier(defaultTier);
      updatePriceDisplay();
    }
  } else {
    // No pricing information available
    document.getElementById("priceSelectionGroup").style.display = "none";
    document.getElementById("priceDisplayGroup").style.display = "none";
    orderData.garmentPrice = 0;
    updatePriceDisplay();
  }
}

// Update the visible single price input to reflect current `orderData.garmentPrice`
function updatePriceDisplay() {
  const input = document.getElementById("garmentPriceInput");
  const dispGroup = document.getElementById("priceDisplayGroup");
  if (input && dispGroup && dispGroup.style.display !== "none") {
    input.value = orderData.garmentPrice
      ? `$${orderData.garmentPrice.toFixed(2)}`
      : "";
  }
  // Also update totals that rely on the price
  updateFinalTotal();
}

// Function to handle price tier selection
function selectPriceTier(tier) {
  if (!tier) return;

  // Call the helper function to update the price with the selected tier
  updateGarmentPriceWithTier(tier);

  // Refresh the visible unit price (if shown)
  updatePriceDisplay();

  // Update the order summary if we're on that section
  if (currentSection === 3) {
    generateOrderSummary();
  }
}

// Function to update size options in personalization section based on selected garment
function updateSizeOptionsForGarment(sizes) {
  // Size field is now shown for all garments
  // Update existing personalization items
  document.querySelectorAll(".personalization-item").forEach((item) => {
    const sizeSelect = item.querySelector('[data-field="size"]');

    if (sizeSelect) {
      // Always show the size field
      const sizeFieldContainer = sizeSelect.closest(".form-group");
      if (sizeFieldContainer) {
        sizeFieldContainer.style.display = "block";
        sizeFieldContainer.style.visibility = "visible";
      }

      // Clear existing options except the first one
      sizeSelect.innerHTML = '<option value="">Select size...</option>';

      // Add new size options based on selected garment
      if (sizes && sizes.length > 0) {
        sizes.forEach((size) => {
          const option = document.createElement("option");
          option.value = size;
          option.textContent = size;
          sizeSelect.appendChild(option);
        });
      }
    }
  });
}

// Size selection
function selectSize(size) {
  orderData.selectedSize = size;
  validateSection2();
  updateGarmentPriceBasedOnQuantity();
  if (currentSection === 3) {
    generateOrderSummary();
  }
}

// Quantity selection
function updateQuantity(quantity) {
  const normalizedQuantity = Math.max(parseInt(quantity, 10) || 1, 1);
  orderData.selectedQuantity = normalizedQuantity;
  const quantityInput = document.getElementById("quantityInput");
  if (quantityInput && parseInt(quantityInput.value, 10) !== normalizedQuantity) {
    quantityInput.value = normalizedQuantity;
  }
  updateGarmentPriceBasedOnQuantity();
  if (currentSection === 3) {
    generateOrderSummary();
  }
}

// Section 3: Decoration
function selectDecoration(decoration) {
  orderData.decoration = decoration;

  const prices = {
    "no-personalisation": 0,
    "name-only": 8.0,
    "logo-name": 12.0,
    "logo-only": 9.5,
    "dept-only": 8.5,
    "dept-name": 9.5,
  };

  orderData.decorationPrice = prices[decoration] || 0;

  const logoSelectionGroup = document.getElementById("logoSelectionGroup");
  const nameInputGroup = document.getElementById("nameInputGroup");
  const nameApprovalGroup = document.getElementById("nameApprovalGroup");
  const deptSelectionGroup = document.getElementById("deptSelectionGroup");
  const rowBasedMode = isRowBasedDepartmentMode(decoration);
  const showGlobalNameInput =
    decorationRequiresIndividualName(decoration) && !rowBasedMode;
  const showNameApproval = decorationRequiresIndividualName(decoration);
  const showDepartmentSelect = decorationRequiresDepartment(decoration);

  if (logoSelectionGroup) logoSelectionGroup.style.display = "none";
  if (nameInputGroup) nameInputGroup.style.display = "none";
  if (nameApprovalGroup) nameApprovalGroup.style.display = "none";
  if (deptSelectionGroup) deptSelectionGroup.style.display = "none";

  if (decoration === "logo-only" || decoration === "logo-name") {
    if (logoSelectionGroup) logoSelectionGroup.style.display = "block";
  }
  if (showGlobalNameInput && nameInputGroup) {
    nameInputGroup.style.display = "block";
  }
  if (showNameApproval && nameApprovalGroup) {
    nameApprovalGroup.style.display = "block";
  }
  if (showDepartmentSelect && deptSelectionGroup) {
    deptSelectionGroup.style.display = "block";
  }

  if (decoration !== "logo-only" && decoration !== "logo-name") {
    document.getElementById("logoSelect").value = "";
    orderData.logo = "";
  }
  if (!showDepartmentSelect) {
    document.getElementById("decorationDeptSelect").value = "";
    orderData.decorationDepartment = "";
  }
  if (!showGlobalNameInput) {
    document.getElementById("decorationNameInput").value = "";
    orderData.decorationName = "";
  }
  if (!showNameApproval) {
    const nameApprovalCheckbox = document.getElementById("nameApprovalChecked");
    if (nameApprovalCheckbox) {
      nameApprovalCheckbox.checked = false;
    }
    orderData.nameApprovalChecked = false;
  }
  if (rowBasedMode) {
    const garmentSelect = document.getElementById("garmentSelect");
    const sizeSelect = document.getElementById("sizeSelect");
    const sizeMetricSelect = document.getElementById("sizeMetricSelect");
    if (garmentSelect) {
      garmentSelect.value = "";
    }
    if (sizeSelect) {
      sizeSelect.innerHTML = '<option value="">Select size...</option>';
    }
    if (sizeMetricSelect) {
      sizeMetricSelect.innerHTML =
        '<option value="">Select measurement...</option>';
    }
    orderData.garment = "";
    orderData.selectedSize = "";
    orderData.selectedSizeMetric = "";
    orderData.garmentPrice = 0;
    orderData.totalGarmentPrice = 0;
  }

  syncDepartmentBulkUI();
  updateGarmentPriceBasedOnQuantity();
  validateSection2();
}

// Logo selection
function selectLogo(logo) {
  orderData.logo = logo;
  validateSection2();
}

// Name input
function saveDecorationName(name) {
  orderData.decorationName = name;
  validateSection2();
}

function saveNameApproval(isChecked) {
  orderData.nameApprovalChecked = Boolean(isChecked);
  validateSection2();
}

// Department selection
function saveDecorationDepartment(dept) {
  orderData.decorationDepartment = dept;
  collectPersonalizationData();
  validateSection2();
}

function getSection2ValidationState() {
  collectPersonalizationData();

  const decoration = orderData.decoration;
  const errors = [];
  const rowBasedMode = isRowBasedDepartmentMode(decoration);

  if (!decoration) {
    errors.push("Please select a decoration option.");
  }

  if (!rowBasedMode) {
    if (!orderData.garment) {
      errors.push("Please select a garment type.");
    }
    if (!orderData.selectedSize) {
      errors.push("Please select a size.");
    }
  }

  if ((decoration === "logo-only" || decoration === "logo-name") && !orderData.logo) {
    errors.push("Please select a logo.");
  }

  if (decorationRequiresDepartment(decoration) && !orderData.decorationDepartment) {
    errors.push("Please select a department.");
  }

  if (decorationRequiresIndividualName(decoration) && !orderData.nameApprovalChecked) {
    errors.push("Please confirm the cost centre approval disclaimer.");
  }

  if (decorationRequiresIndividualName(decoration) && !rowBasedMode) {
    if (!orderData.decorationName || orderData.decorationName.trim() === "") {
      errors.push("Please enter the individual person's name.");
    }
  }

  if (rowBasedMode) {
    if (orderData.personalizationItems.length === 0) {
      errors.push("Please add at least one department line item.");
    }

    orderData.personalizationItems.forEach((item, index) => {
      const rowLabel = `Line item ${index + 1}`;
      if (requiresRowEmbroideryName(decoration) && !item.name.trim()) {
        errors.push(`${rowLabel}: please enter the embroidery first name.`);
      }
      if (!item.garment) {
        errors.push(`${rowLabel}: please select a garment type.`);
      }
      if (!item.size) {
        errors.push(`${rowLabel}: please select a size.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate section 2 (garment and decoration)
function validateSection2() {
  const validationState = getSection2ValidationState();
  const nextButton = document.getElementById("next2");
  if (nextButton) {
    nextButton.disabled = !validationState.isValid;
  }
  return validationState.isValid;
}

// Section 4: Personalization Items
function initializePersonalizationSection() {
  if (orderData.orderType !== "department") {
    return;
  }
  if (document.querySelectorAll(".personalization-item").length === 0) {
    renderPersonalizationItems(orderData.personalizationItems);
  }
}

function addPersonalizationItem() {
  const items = getPersonalizationRowSnapshot();
  items.push({
    name: "",
    garment: "",
    size: "",
    quantity: 1,
  });
  renderPersonalizationItems(items);
  updateGarmentPriceBasedOnQuantity();
  validateSection2();
}

function removePersonalizationItem(id) {
  const remainingItems = getPersonalizationRowSnapshot().filter(
    (item) => String(item.id) !== String(id),
  );

  if (orderData.orderType === "department" && remainingItems.length === 0) {
    renderPersonalizationItems([]);
  } else {
    renderPersonalizationItems(remainingItems);
  }

  updateGarmentPriceBasedOnQuantity();
  validateSection2();
  renderLiveSummaryPanel();
}

function collectPersonalizationData() {
  const sizeInput = document.getElementById("sizeSelect");
  const quantityInput = document.getElementById("quantityInput");
  const selectedSize = orderData.selectedSize || sizeInput?.value || "";
  const selectedQuantity = Math.max(
    parseInt(orderData.selectedQuantity || quantityInput?.value, 10) || 1,
    1,
  );

  orderData.selectedSize = selectedSize;
  orderData.selectedQuantity = selectedQuantity;
  orderData.personalizationItems = [];

  const personalizationRows = Array.from(
    document.querySelectorAll(".personalization-item"),
  );
  if (personalizationRows.length === 0) {
    if (isRowBasedDepartmentMode()) {
      return;
    }

    orderData.personalizationItems.push({
      id: "1",
      department: orderData.decorationDepartment || "",
      name: orderData.decorationName || "",
      garment: orderData.garment || "",
      size: selectedSize,
      quantity: selectedQuantity,
    });
    return;
  }

  personalizationRows.forEach((item, index) => {
    const personId = item.dataset.personId || item.id.split("-")[1] || `${index + 1}`;
    const rowQuantity = Math.max(
      parseInt(item.querySelector('[data-field="quantity"]')?.value, 10) ||
        selectedQuantity,
      1,
    );
    const rowGarment =
      item.querySelector('[data-field="garment"]')?.value || orderData.garment || "";
    const rowSize =
      item.querySelector('[data-field="size"]')?.value || selectedSize;

    orderData.personalizationItems.push({
      id: personId,
      department: orderData.decorationDepartment || "",
      name:
        item.querySelector('[data-field="name"]')?.value.trim() ||
        (isRowBasedDepartmentMode() ? "" : orderData.decorationName || ""),
      garment: rowGarment,
      size: rowSize,
      quantity: rowQuantity,
    });
  });
}

function handlePersonalizationFieldChange(target) {
  if (!target || !target.closest(".personalization-item")) {
    return;
  }

  clearAddToCartErrors();

  if (target.dataset.field === "garment") {
    const row = target.closest(".personalization-item");
    const sizeSelect = row?.querySelector('[data-field="size"]');
    const currentSize = sizeSelect?.value || "";

    if (sizeSelect) {
      sizeSelect.innerHTML = buildSizeOptionsMarkup(target.value, currentSize);
      if (
        currentSize &&
        !Array.from(sizeSelect.options).some(
          (option) => option.value === currentSize,
        )
      ) {
        sizeSelect.value = "";
      }
    }
  }

  updateGarmentPriceBasedOnQuantity();
  validateSection2();
  renderLiveSummaryPanel();
}

// Function to update garment price based on total quantity ordered
function updateGarmentPriceBasedOnQuantity() {
  collectPersonalizationData();

  if (isRowBasedDepartmentMode()) {
    const groupedItems = new Map();
    orderData.personalizationItems.forEach((item) => {
      if (!item.garment || !item.size) {
        return;
      }

      const existingGroup = groupedItems.get(item.garment) || {
        totalQuantity: 0,
        items: [],
      };
      existingGroup.totalQuantity += item.quantity || 0;
      existingGroup.items.push(item);
      groupedItems.set(item.garment, existingGroup);
    });

    let totalPrice = 0;
    let totalQuantity = 0;
    groupedItems.forEach((group, garmentId) => {
      const priceTier = getAutomaticPriceTier(group.totalQuantity);
      group.items.forEach((item) => {
        const unitPrice = resolveGarmentUnitPrice(
          garmentId,
          item.size,
          priceTier,
        );
        totalPrice += unitPrice * (item.quantity || 0);
        totalQuantity += item.quantity || 0;
      });
    });

    orderData.totalGarmentPrice = totalPrice;
    orderData.garmentPrice = totalQuantity ? totalPrice / totalQuantity : 0;
    const priceTierSelect = document.getElementById("priceTierSelect");
    if (priceTierSelect) {
      priceTierSelect.value = "";
    }
  } else {
    const priceTierSelect = document.getElementById("priceTierSelect");
    const totalQuantity = getTotalQuantity(orderData.personalizationItems);
    const fallbackTier = getAutomaticPriceTier(totalQuantity);
    const selectedPriceTier = normalizePriceTierValue(
      priceTierSelect?.value || fallbackTier,
    );

    if (priceTierSelect && !priceTierSelect.value && orderData.garment) {
      priceTierSelect.value = selectedPriceTier;
    }

    updateGarmentPriceWithTier(selectedPriceTier);
  }

  if (currentSection === 3) {
    generateOrderSummary();
  }

  updatePriceDisplay();
  renderLiveSummaryPanel();
}

// Helper function to update garment price with a specific tier
function updateGarmentPriceWithTier(priceTier) {
  const normalizedPriceTier = normalizePriceTierValue(priceTier);
  const garmentInfo = buildGarmentInfoMap()[orderData.garment];

  if (!orderData.garment || !garmentInfo?.prices) {
    orderData.garmentPrice = 0;
    orderData.totalGarmentPrice = 0;
    updatePriceDisplay();
    return;
  }

  const totalQuantity = getTotalQuantity(orderData.personalizationItems);
  if (garmentInfo.sizeRangePrices) {
    let totalPrice = 0;
    orderData.personalizationItems.forEach((item) => {
      if (!item.size) return;
      totalPrice +=
        resolveGarmentUnitPrice(orderData.garment, item.size, normalizedPriceTier) *
        (item.quantity || 0);
    });
    orderData.totalGarmentPrice = totalPrice;
    orderData.garmentPrice =
      totalQuantity > 0
        ? totalPrice / totalQuantity
        : resolveGarmentUnitPrice(orderData.garment, orderData.selectedSize, normalizedPriceTier);
  } else {
    orderData.garmentPrice = resolveGarmentUnitPrice(
      orderData.garment,
      orderData.selectedSize,
      normalizedPriceTier,
    );
    orderData.totalGarmentPrice = orderData.garmentPrice * totalQuantity;
  }

  updatePriceDisplay();
}

// Section 5: Order Summary
function generateOrderSummary() {
  collectPersonalizationData();
  updateSection3ShippingUI();

  const container = document.getElementById("orderSummaryContent");
  const itemsMount = document.getElementById("personalizationReviewList");
  if (!container) {
    updateFinalTotal();
    return;
  }

  const depotSelect = document.getElementById("depot");
  const depotText =
    depotSelect && depotSelect.selectedIndex >= 0
      ? depotSelect.options[depotSelect.selectedIndex].text
      : "Not selected";
  const reviewItems = getPersonalizationItemsForReview(orderData);

  const totalQuantity = getTotalQuantity(reviewItems);
  const garmentTotal =
    typeof orderData.totalGarmentPrice === "number"
      ? orderData.totalGarmentPrice
      : (orderData.garmentPrice || 0) * totalQuantity;
  const decorationTotal = (orderData.decorationPrice || 0) * totalQuantity;
  const shippingTotal = orderData.shippingPrice || 0;
  const grandTotal = garmentTotal + decorationTotal + shippingTotal;

  const rows = [
    [
      "Order type",
      orderData.orderType
        ? orderData.orderType === "department"
          ? "Department"
          : "Individual"
        : "Not selected",
    ],
    ["Cost centre", depotText],
    ["Garment", getOrderGarmentSummary(orderData)],
    ["Decoration", getDecorationName(orderData.decoration)],
    ["Quantity", `${totalQuantity} items`],
    ["Garment cost", `$${garmentTotal.toFixed(2)}`],
    ["Decoration cost", `$${decorationTotal.toFixed(2)}`],
  ];

  rows.push(["Shipping", `$${shippingTotal.toFixed(2)}`]);

  if (orderData.decorationName && !isRowBasedDepartmentMode()) {
    rows.push(["Name", orderData.decorationName]);
  }
  if (orderData.decorationDepartment) {
    rows.push(["Department", orderData.decorationDepartment]);
  }
  if (orderData.logo) {
    rows.push(["Logo", getLogoName(orderData.logo)]);
  }

  rows.push(["Order total", `$${grandTotal.toFixed(2)}`]);

  container.innerHTML = rows
    .map(
      ([key, value]) =>
        `<div class="reviewRow"><span class="reviewKey">${escapeHtml(key)}</span><span>${escapeHtml(value)}</span></div>`,
    )
    .join("");

  if (itemsMount) {
    itemsMount.innerHTML =
      reviewItems.length > 0
        ? reviewItems
            .map((item, index) => {
              const metaLines = [
                item.name
                  ? `<div class="reviewItem__line"><span>Embroidery</span><strong>${escapeHtml(item.name)}</strong></div>`
                  : "",
                orderData.decorationDepartment
                  ? `<div class="reviewItem__line"><span>Department</span><strong>${escapeHtml(orderData.decorationDepartment)}</strong></div>`
                  : "",
                `<div class="reviewItem__line"><span>Garment</span><strong>${escapeHtml(getGarmentName(item.garment || orderData.garment || ""))}</strong></div>`,
                `<div class="reviewItem__line"><span>Size</span><strong>${escapeHtml(item.size || orderData.selectedSize || "Not selected")}</strong></div>`,
                `<div class="reviewItem__line"><span>Qty</span><strong>${escapeHtml(item.quantity || 0)}</strong></div>`,
              ]
                .filter(Boolean)
                .join("");

              return `
                <div class="reviewItem">
                  <div class="reviewItem__top">
                    <div class="reviewItem__title">Line item ${index + 1}</div>
                    ${
                      orderData.orderType === "department"
                        ? `<button class="miniBtn" type="button" onclick="editPersonalization(${index + 1})">Edit</button>`
                        : ""
                    }
                  </div>
                  <div class="reviewItem__meta">${metaLines}</div>
                </div>
              `;
            })
            .join("")
        : '<div class="reviewEmpty">No line items added yet.</div>';
  }

  updateFinalTotal();
}

// Allow editing individual personalizations from review
function editPersonalization(id) {
  prevSection(3);

  if (orderData.orderType === "department") {
    renderPersonalizationItems(orderData.personalizationItems);
  }

  if (orderData.selectedSize) {
    document.getElementById("sizeSelect").value = orderData.selectedSize;
  }
  if (orderData.selectedQuantity) {
    document.getElementById("quantityInput").value = orderData.selectedQuantity;
  }

  const target = document.querySelector(`#person-${id}`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const firstField = target.querySelector("input, select");
    if (firstField) firstField.focus();
  }
}

function getGarmentName(garment) {
  const names = {
    "mens-polo-xs-5xl": "Mens Polo 1065 (XS - 5XL)",
    "mens-polo-5xl-10xl": "Mens Polo JB210 6XL +",
    "womens-polo-xs-2xl": "Ladies Polo JH201W (XS-2XL)",
    "womens-polo-20-26": "Ladies Polo 1165 (20 - 26)",
    "premium-unisex-tech-jacket-2xl-5xl":
      "Podium Unisex Tech Jacket (2XS - 5XL)",
    "mens-olympus-softshell-jacket-s-8xl":
      "Mens Olympus Softshell Jacket (S - 8XL)",
    "ladies-olympus-softshell-jacket-8-26":
      "Ladies Olympus Softshell Jacket (8 - 26)",
  };
  return names[garment] || garment; // Return the garment ID if name not found
}

function getDecorationName(decoration) {
  const names = {
    "no-personalisation": "No Personalisation (pre-decorated EE logo)",
    "name-only": "Individual name only (RHC)",
    "logo-name": "Logo + individual name (LHC)",
    "logo-only": "Logo only (RHC)",
    "dept-only": "Department name only",
    "dept-name": "Department + individual name",
  };
  return names[decoration] || decoration || "Not selected";
}

function getLogoName(logo) {
  const names = {
    "nsw-government": "NSW Government",
    "essential-energy": "Essential Energy",
    transport: "Transport for NSW",
    "sydney-trains": "Sydney Trains",
    "nsw-trains": "NSW TrainLink",
    "roads-maritime": "Transport for NSW (Roads & Maritime)",
    "service-nsw": "Service NSW",
    "health-nsw": "NSW Health",
    "education-nsw": "NSW Department of Education",
    other: "Other (please contact your cost centre)",
  };
  return names[logo] || logo;
}

// Size guides modal/lightbox
function openSizeGuides() {
  // simple implementation: open a small modal with tabs for size guide images
  const modalId = "sizeGuidesModal";
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.position = "fixed";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.right = "0";
    modal.style.bottom = "0";
    modal.style.background = "rgba(0,0,0,0.6)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.innerHTML = `
      <div style="background:#fff;padding:20px;border-radius:8px;max-width:800px;width:90%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;">
        <h3 style="margin-top:0;margin-bottom:16px;">Size Guides</h3>
        
        <!-- Tab buttons -->
        <div style="display:flex;gap:4px;margin-bottom:16px;">
          <button id="tab1" class="size-guide-tab active" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-weight:bold;" onclick="switchSizeGuideTab('sizes/image1.jpeg', this)">Polos</button>
          <button id="tab2" class="size-guide-tab" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;" onclick="switchSizeGuideTab('sizes/image2.jpeg', this)">Podium Jacket</button>
          <button id="tab3" class="size-guide-tab" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;" onclick="switchSizeGuideTab('sizes/image3.jpeg', this)">Olympus Jackets</button>
        </div>
        
        <!-- Image container -->
        <div style="flex:1;overflow:auto;position:relative;">
          <img id="sizeGuideImage" src="sizes/image1.jpeg" alt="Size Guide" style="width:100%;height:auto;max-height:60vh;object-fit:contain;">
        </div>
        
        <div style="text-align:right;margin-top:12px;">
          <button onclick="document.getElementById('${modalId}').remove()" style="padding:8px 16px;background:#64748b;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
        </div>
      </div>
    `;
  }

  // Add CSS for active tab
  const style = document.createElement("style");
  style.id = "size-guide-style";
  style.textContent = `
    .size-guide-tab.active {
      background: #2563eb !important;
      color: white !important;
    }
  `;
  if (!document.getElementById("size-guide-style")) {
    document.head.appendChild(style);
  }

  document.body.appendChild(modal);
}

// Function to switch between size guide tabs
function switchSizeGuideTab(imagePath, clickedButton) {
  // Update the image source
  const imgElement = document.getElementById("sizeGuideImage");
  imgElement.src = imagePath;

  // Update active tab styling
  const tabs = document.querySelectorAll(".size-guide-tab");
  tabs.forEach((tab) => {
    tab.classList.remove("active");
  });

  clickedButton.classList.add("active");
}

function selectShipping(type, element) {
  orderData.shipping = type;
  orderData.shippingPrice = SHIPPING_PRICES[type] || 0;

  const selectedInput = document.querySelector(
    `input[name="shipping"][value="${type}"]`,
  );
  if (selectedInput) {
    selectedInput.checked = true;
  }

  let selectedOption = element;
  if (!selectedOption && selectedInput) {
    selectedOption = selectedInput.closest(".shipOption");
  }

  document.querySelectorAll('input[name="shipping"]').forEach((input) => {
    const option = input.closest(".shipOption");
    if (option) {
      option.classList.remove("shipOption--selected");
    }
  });
  if (selectedOption) {
    selectedOption.classList.add("shipOption--selected");
  }

  clearAddToCartErrors();
  updateFinalTotal();
}

function selectCheckoutShipping(type) {
  checkoutShippingData.shipping = type;
  checkoutShippingData.shippingPrice = SHIPPING_PRICES[type] || 0;

  clearCheckoutShippingErrors();
  updateCheckoutModalTotals(checkoutShippingData.shippingPrice);
}

function updateFinalTotal() {
  collectPersonalizationData();

  const totalQuantity = getTotalQuantity(orderData.personalizationItems);
  const garmentTotal =
    typeof orderData.totalGarmentPrice === "number"
      ? orderData.totalGarmentPrice
      : orderData.garmentPrice * totalQuantity;
  const decorationTotal = orderData.decorationPrice * totalQuantity;
  const shippingTotal = orderData.shippingPrice || 0;
  const finalTotal = garmentTotal + decorationTotal + shippingTotal;

  document.getElementById("finalTotal").textContent =
    `$${finalTotal.toFixed(2)}`;
}

function clearAddToCartErrors() {
  const container = document.getElementById("addOrderErrors");
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("is-visible");
}

function clearCheckoutShippingErrors() {
  const container = document.getElementById("checkoutShippingErrors");
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("is-visible");
}

function updateCheckoutModalTotals(sharedShippingPrice = 0) {
  const totalElement = document.getElementById("checkoutGrandTotal");
  if (!totalElement) return;
  const total = calculateCartTotal(sharedShippingPrice);
  totalElement.textContent = `$${total.toFixed(2)}`;
}

let successToastTimer;
function showSuccessToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  if (successToastTimer) {
    clearTimeout(successToastTimer);
  }

  successToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function renderAddToCartErrors(errors) {
  const container = document.getElementById("addOrderErrors");
  if (!container) return;

  if (!errors || errors.length === 0) {
    clearAddToCartErrors();
    return;
  }

  const listItems = errors.map((message) => `<li>${message}</li>`).join("");
  container.innerHTML = `<ul>${listItems}</ul>`;
  container.classList.add("is-visible");
}

function renderCheckoutShippingErrors(errors) {
  const container = document.getElementById("checkoutShippingErrors");
  if (!container) return;

  if (!errors || errors.length === 0) {
    clearCheckoutShippingErrors();
    return;
  }

  const listItems = errors.map((message) => `<li>${message}</li>`).join("");
  container.innerHTML = `<ul>${listItems}</ul>`;
  container.classList.add("is-visible");
}

function validateAddToCart() {
  const errors = [];
  const requiresNameApproval = decorationRequiresIndividualName();
  const section2Validation = getSection2ValidationState();
  const confirmed =
    document.getElementById("confirmChecked") &&
    document.getElementById("confirmChecked").checked;
  const deliveryName = document.getElementById("deliveryNameSelect").value.trim();
  const shippingDetails = readShippingDetailsFromForm();

  if (!section2Validation.isValid) {
    section2Validation.errors.forEach((message) => {
      if (!errors.includes(message)) {
        errors.push(message);
      }
    });
  }

  if (!deliveryName) {
    errors.push("Please enter a name on delivery.");
  }

  if (!shippingDetails.streetNumber) {
    errors.push("Please enter a street number.");
  }
  if (!shippingDetails.streetAddress1) {
    errors.push("Please enter street address line 1.");
  }
  if (!shippingDetails.suburb) {
    errors.push("Please enter a suburb.");
  }
  if (!shippingDetails.state) {
    errors.push("Please enter a state.");
  }
  if (!shippingDetails.postcode) {
    errors.push("Please enter a postcode.");
  }

  if (!orderData.shipping) {
    errors.push("Please select a shipping option.");
  }

  if (requiresNameApproval && !orderData.nameApprovalChecked) {
    errors.push("Please confirm the cost centre approval disclaimer.");
  }

  if (!confirmed) {
    errors.push(
      "Please confirm that you have checked all personalisation details before adding to cart.",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    shippingDetails,
    deliveryName,
  };
}

function addToCart() {
  clearAddToCartErrors();
  updateGarmentPriceBasedOnQuantity();

  const validationResult = validateAddToCart();
  if (!validationResult.isValid) {
    renderAddToCartErrors(validationResult.errors);
    return;
  }

  const deliveryName = validationResult.deliveryName;
  const shippingDetails = validationResult.shippingDetails;
  const shippingAddress = formatShippingAddress(shippingDetails);
  orderData.shippingDetails = shippingDetails;

  // Save current order to cart
  const orderCopy = JSON.parse(JSON.stringify(orderData));
  orderCopy.deliveryName = deliveryName;
  orderCopy.shippingDetails = shippingDetails;
  orderCopy.shippingAddress = shippingAddress;
  orderCopy.shipping = orderData.shipping;
  orderCopy.shippingPrice = orderData.shippingPrice;
  orderCopy.orderNumber = orderCart.length + 1;
  orderCopy.id = Date.now(); // Unique ID for editing
  orderCart.push(orderCopy);

  // Save to sessionStorage
  saveCart();

  // Reset form for new order
  resetForm();
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.style.display = "none";
  }
  showSuccessToast(
    "Order added to cart. You can add another order now.",
  );
}

// Remove order from cart
async function removeFromCart(index) {
  const confirmed = await showAppConfirm(
    "Are you sure you want to remove this order from the cart?",
    {
      title: "Remove Order",
      confirmText: "Remove",
      cancelText: "Keep",
      variant: "warning",
    },
  );
  if (!confirmed) return;

  orderCart.splice(index, 1);
  // Renumber orders
  orderCart.forEach((order, i) => {
    order.orderNumber = i + 1;
  });
  saveCart();
}

// Clear entire cart
async function clearCart() {
  const confirmed = await showAppConfirm(
    "Are you sure you want to clear all orders from the cart?",
    {
      title: "Clear Cart",
      confirmText: "Clear Cart",
      cancelText: "Cancel",
      variant: "warning",
    },
  );
  if (!confirmed) return;

  orderCart = [];
  saveCart();
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.style.display = "none";
  }
}

// Edit order from cart (load it back into the form)
function editOrderFromCart(index) {
  if (orderCart.length === 0) return;

  const order = orderCart[index];

  // Remove from cart
  orderCart.splice(index, 1);
  // Renumber orders
  orderCart.forEach((o, i) => {
    o.orderNumber = i + 1;
  });
  saveCart();

  // Load order data back into form
  orderData = {
    orderType: order.orderType,
    depot: order.depot,
    department: order.department,
    garment: order.garment,
    garmentPrice: order.garmentPrice,
    decoration: order.decoration,
    decorationPrice: order.decorationPrice,
    logo: order.logo,
    decorationName: order.decorationName,
    nameApprovalChecked: Boolean(order.nameApprovalChecked),
    decorationDepartment: order.decorationDepartment,
    personalizationItems: order.personalizationItems || [],
    selectedSize: order.selectedSize || "",
    selectedSizeMetric: order.selectedSizeMetric || "",
    selectedQuantity: Math.max(parseInt(order.selectedQuantity, 10) || 1, 1),
    totalGarmentPrice:
      typeof order.totalGarmentPrice === "number"
        ? order.totalGarmentPrice
        : 0,
    shipping: order.shipping || "",
    shippingPrice: order.shippingPrice || 0,
    shippingDetails: order.shippingDetails || {
      unitNumber: "",
      streetNumber: "",
      streetAddress1: "",
      streetAddress2: "",
      suburb: "",
      state: "",
      postcode: "",
    },
  };

  // Populate form fields
  const orderTypeRadio = document.querySelector(`input[name="orderType"][value="${order.orderType}"]`);
  if (orderTypeRadio) {
    orderTypeRadio.checked = true;
    const card = orderTypeRadio.closest(".choiceCard");
    if (card) {
      selectOrderType(order.orderType, card);
    }
  } else {
    selectOrderType(order.orderType);
  }
  document.getElementById("depot").value = order.depot;
  selectDepot();

  // Show/hide department field based on order type
  if (order.orderType === "department") {
    document.getElementById("deptSelectSection1").style.display = "block";
    document.getElementById("departmentSelect").value = order.department;
    selectDepartment();
  } else {
    document.getElementById("deptSelectSection1").style.display = "none";
  }
  document.getElementById("deliveryNameSelect").value = order.deliveryName || "";
  applyShippingDetailsToForm(order.shippingDetails || null);
  updateShippingPrefillUI();
  if (order.shipping) {
    selectShipping(order.shipping);
  }
  updateSection3ShippingUI();
  syncDepartmentBulkUI();

  // Set garment
  const rowBasedDepartmentOrder = isRowBasedDepartmentMode(
    order.decoration,
    order.orderType,
  );
  document.getElementById("garmentSelect").value = rowBasedDepartmentOrder
    ? ""
    : order.garment;
  selectGarment(rowBasedDepartmentOrder ? "" : order.garment);

  // Set decoration
  const decorationSelect = document.getElementById("decorationSelect");
  if (
    decorationSelect &&
    Array.from(decorationSelect.options).some(
      (option) => option.value === order.decoration,
    )
  ) {
    decorationSelect.value = order.decoration;
    selectDecoration(order.decoration);
  }
  const nameApprovalCheckbox = document.getElementById("nameApprovalChecked");
  if (nameApprovalCheckbox) {
    nameApprovalCheckbox.checked = Boolean(order.nameApprovalChecked);
  }
  orderData.nameApprovalChecked = Boolean(order.nameApprovalChecked);

  // Set logo if applicable
  if (order.logo) {
    document.getElementById("logoSelect").value = order.logo;
    selectLogo(order.logo);
  }

  // Set name if applicable
  if (order.decorationName && !isRowBasedDepartmentMode(order.decoration, order.orderType)) {
    document.getElementById("decorationNameInput").value = order.decorationName;
    saveDecorationName(order.decorationName);
  }

  // Set department if applicable
  if (order.decorationDepartment) {
    document.getElementById("decorationDeptSelect").value = order.decorationDepartment;
    saveDecorationDepartment(order.decorationDepartment);
  }

  // Set size and quantity
  if (order.selectedSizeMetric) {
    const metricSelect = document.getElementById("sizeMetricSelect");
    if (
      metricSelect &&
      Array.from(metricSelect.options).some(
        (option) => option.value === order.selectedSizeMetric,
      )
    ) {
      metricSelect.value = order.selectedSizeMetric;
      selectSizeMetric(order.selectedSizeMetric);
    }
  }
  if (order.selectedSize) {
    document.getElementById("sizeSelect").value = order.selectedSize;
    orderData.selectedSize = order.selectedSize;
  }
  if (order.selectedQuantity) {
    document.getElementById("quantityInput").value = order.selectedQuantity;
    orderData.selectedQuantity = order.selectedQuantity;
  }

  if (order.orderType === "department") {
    renderPersonalizationItems(order.personalizationItems || []);
  }

  updateGarmentPriceBasedOnQuantity();
  validateSection2();

  // Go to section 2 (Garment & Decoration)
  setActiveSection(2);

  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.style.display = "none";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCheckoutShippingModal() {
  const modal = document.getElementById("checkoutShippingModal");
  if (!modal) return;

  const individualOrderCount = orderCart.filter(
    (order) => order.orderType === "individual",
  ).length;
  const departmentOrderCount = orderCart.length - individualOrderCount;
  const summary = document.getElementById("checkoutShippingSummary");
  if (summary) {
    const orderSummary =
      departmentOrderCount > 0
        ? `${individualOrderCount} individual and ${departmentOrderCount} department order(s)`
        : `${individualOrderCount} individual order(s)`;
    summary.textContent = `Cart has ${orderSummary}. Current total: $${calculateCartTotal().toFixed(2)}.`;
  }

  checkoutShippingData = {
    shipping: "",
    shippingPrice: 0,
  };
  document.getElementById("checkoutDeliveryNameSelect").value = "";
  document.getElementById("checkoutShippingAddress").value = "";
  const checkoutShippingSelect = document.getElementById("checkoutShippingSelect");
  if (checkoutShippingSelect) {
    checkoutShippingSelect.value = "";
  }
  clearCheckoutShippingErrors();
  updateCheckoutModalTotals(0);

  modal.style.display = "block";
}

function closeCheckoutShippingModal() {
  const modal = document.getElementById("checkoutShippingModal");
  if (!modal) return;
  modal.style.display = "none";
  clearCheckoutShippingErrors();
}

function validateCheckoutSharedShipping() {
  const errors = [];
  const deliveryName = document.getElementById("checkoutDeliveryNameSelect").value.trim();
  const shippingAddress = document
    .getElementById("checkoutShippingAddress")
    .value.trim();

  if (!deliveryName) {
    errors.push("Please enter a name on delivery.");
  }

  if (!shippingAddress) {
    errors.push("Please enter a shipping address.");
  }

  if (!checkoutShippingData.shipping) {
    errors.push("Please select a shipping option.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    deliveryName,
    shippingAddress,
    shipping: checkoutShippingData.shipping,
    shippingPrice: checkoutShippingData.shippingPrice,
  };
}

function clearStripePaymentErrors() {
  const container = document.getElementById("stripePaymentErrors");
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("is-visible");
}

function renderStripePaymentErrors(messages) {
  const container = document.getElementById("stripePaymentErrors");
  if (!container) return;

  const errors = Array.isArray(messages) ? messages : [messages];
  const listItems = errors.map((message) => `<li>${message}</li>`).join("");
  container.innerHTML = `<ul>${listItems}</ul>`;
  container.classList.add("is-visible");
}

async function loadStripeConfig() {
  if (stripeConfigLoaded && stripePublishableKey) {
    return true;
  }

  try {
    const response = await fetch(apiUrl("/api/config"), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok || !payload.stripePublishableKey) {
      throw new Error(
        payload.error || "Unable to load Stripe configuration from server.",
      );
    }

    stripePublishableKey = payload.stripePublishableKey;
    stripeConfigLoaded = true;
    return true;
  } catch (error) {
    console.error("Stripe config error:", error);
    stripeConfigLoaded = false;
    stripePublishableKey = "";
    return false;
  }
}

function savePendingStripeCheckout(ordersToSubmit, finalTotal) {
  const payload = {
    ordersToSubmit: JSON.parse(JSON.stringify(ordersToSubmit)),
    finalTotal,
  };
  sessionStorage.setItem(PENDING_STRIPE_CHECKOUT_KEY, JSON.stringify(payload));
}

function readPendingStripeCheckout() {
  const raw = sessionStorage.getItem(PENDING_STRIPE_CHECKOUT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.ordersToSubmit) ||
      typeof parsed.finalTotal !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Could not parse pending Stripe checkout data:", error);
    return null;
  }
}

function clearPendingStripeCheckout() {
  sessionStorage.removeItem(PENDING_STRIPE_CHECKOUT_KEY);
}

function cloneJsonValue(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function buildPaymentSuccessPayload(ordersToSubmit, finalTotal, paymentInformation) {
  return {
    submittedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    checkoutTotal: Number(finalTotal) || 0,
    formData: cloneJsonValue(ordersToSubmit, []),
    paymentInformation: cloneJsonValue(paymentInformation, {}),
  };
}

function buildPaymentSuccessFormBody(payload) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const serializedValue =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value ?? "");

    params.append(key, serializedValue);
  });

  return params.toString();
}

async function sendPaymentSuccessWebhook(
  ordersToSubmit,
  finalTotal,
  paymentInformation,
) {
  const payload = buildPaymentSuccessPayload(
    ordersToSubmit,
    finalTotal,
    paymentInformation,
  );
  const response = await fetch(apiUrl(PAYMENT_SUCCESS_WEBHOOK_ENDPOINT), {
    method: "POST",
    headers: {
      "Content-Type": FORM_URLENCODED_UTF8_CONTENT_TYPE,
      Accept: "application/json",
    },
    body: buildPaymentSuccessFormBody(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  const responsePayload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(
      responsePayload.error || "Unable to send payment success webhook.",
    );
  }

  return responsePayload;
}

function removeStripeParamsFromUrl() {
  const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

async function handleStripeCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const stripeState = params.get("stripe");
  if (!stripeState) {
    return;
  }

  if (stripeState === "cancelled") {
    clearPendingStripeCheckout();
    removeStripeParamsFromUrl();
    await showAppAlert("Stripe checkout was cancelled. Your cart is still saved.", {
      title: "Checkout Cancelled",
      variant: "warning",
    });
    return;
  }

  if (stripeState !== "success") {
    removeStripeParamsFromUrl();
    return;
  }

  const pendingCheckout = readPendingStripeCheckout();
  const sessionId = params.get("session_id");
  if (!sessionId) {
    removeStripeParamsFromUrl();
    await showAppAlert("Stripe returned without a session ID. Please contact support.", {
      title: "Missing Session",
      variant: "error",
    });
    return;
  }

  let verifiedCheckoutSession = null;
  try {
    const response = await fetch(
      apiUrl(`/api/checkout-session/${encodeURIComponent(sessionId)}`),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      throw new Error(payload.error || "Could not verify Stripe checkout.");
    }

    if (payload.paymentStatus !== "paid") {
      throw new Error("Stripe checkout is not marked as paid.");
    }

    verifiedCheckoutSession = payload;
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Could not verify payment status.";
    removeStripeParamsFromUrl();
    await showAppAlert(`Payment verification failed: ${message}`, {
      title: "Verification Failed",
      variant: "error",
    });
    return;
  }

  if (pendingCheckout) {
    await completeCheckoutAfterPaymentSuccess(
      pendingCheckout.ordersToSubmit,
      pendingCheckout.finalTotal,
      sessionId,
      {
        source: "stripe_checkout",
        sessionId,
        checkoutSession: verifiedCheckoutSession,
      },
    );
  } else {
    await onStripePaymentSuccess(
      {
        source: "stripe_checkout",
        sessionId,
        stripeReferenceId: sessionId,
        checkoutSession: verifiedCheckoutSession,
      },
      [],
      (verifiedCheckoutSession?.amountTotal || 0) / 100,
    );
  }

  clearPendingStripeCheckout();
  removeStripeParamsFromUrl();
}

async function onStripePaymentSuccess(paymentDetails, ordersToSubmit, finalTotal) {
  try {
    await sendPaymentSuccessWebhook(ordersToSubmit, finalTotal, paymentDetails);
  } catch (error) {
    console.warn("Could not send payment success webhook:", error);
  }

  await showAppAlert("Payment successful.", {
    title: "Payment Complete",
    variant: "success",
  });
}

async function startStripeHostedCheckout(ordersToSubmit, finalTotal) {
  if (stripeCheckoutRedirectInProgress) {
    return;
  }
  if (!stripePublishableKey) {
    const configLoaded = await loadStripeConfig();
    if (!configLoaded) {
      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const configMessage = isLocalHost
        ? "Could not load Stripe configuration. Start the backend with 'npm start' and use http://localhost:4242."
        : "Could not load Stripe configuration. In Netlify, set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in Site settings > Environment variables, then redeploy.";
      await showAppAlert(
        configMessage,
        {
          title: "Stripe Configuration Error",
          variant: "error",
        },
      );
      return;
    }
  }
  if (!initStripe()) {
    await showAppAlert("Unable to load Stripe. Please refresh and try again.", {
      title: "Stripe Not Ready",
      variant: "error",
    });
    return;
  }

  stripeCheckoutRedirectInProgress = true;
  try {
    const amount = Math.round((finalTotal || 0) * 100);
    if (amount <= 0) {
      throw new Error("Invalid payment amount.");
    }

    savePendingStripeCheckout(ordersToSubmit, finalTotal);

    const response = await fetch(apiUrl("/api/create-checkout-session"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "aud",
        returnBaseUrl: window.location.origin,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok || !payload.sessionId) {
      throw new Error(
        payload.error || "Could not create Stripe checkout session.",
      );
    }

    const result = await stripe.redirectToCheckout({
      sessionId: payload.sessionId,
    });
    if (result && result.error) {
      throw new Error(result.error.message || "Stripe redirection failed.");
    }
  } catch (error) {
    clearPendingStripeCheckout();
    const message =
      error && error.message
        ? error.message
        : "Unable to start Stripe checkout.";
    await showAppAlert(`Payment failed: ${message}`, {
      title: "Payment Failed",
      variant: "error",
    });
  } finally {
    stripeCheckoutRedirectInProgress = false;
  }
}

function initStripe() {
  if (!stripePublishableKey) {
    return false;
  }
  if (typeof window.Stripe !== "function") {
    return false;
  }

  if (!stripe) {
    stripe = window.Stripe(stripePublishableKey);
  }

  const cardMount = document.getElementById("stripeCardElement");
  if (cardMount && !stripeCardElement) {
    const elements = stripe.elements();
    stripeCardElement = elements.create("card", {
      hidePostalCode: true,
    });
    stripeCardElement.mount("#stripeCardElement");

    stripeCardElement.on("change", function (event) {
      if (event.error) {
        renderStripePaymentErrors(event.error.message);
      } else {
        clearStripePaymentErrors();
      }
    });
  }

  return true;
}

function openStripePaymentModal(ordersToSubmit, finalTotal) {
  const modal = document.getElementById("stripePaymentModal");
  const amountText = document.getElementById("stripePayAmount");

  if (!modal || !amountText) return;

  if (!initStripe()) {
    showAppAlert("Unable to load Stripe. Please refresh and try again.", {
      title: "Stripe Not Ready",
      variant: "error",
    });
    return;
  }

  pendingStripeCheckout = {
    ordersToSubmit: JSON.parse(JSON.stringify(ordersToSubmit)),
    finalTotal,
  };

  amountText.textContent = `$${finalTotal.toFixed(2)}`;
  clearStripePaymentErrors();
  modal.style.display = "block";
}

function closeStripePaymentModal() {
  if (stripePaymentInProgress) return;
  const modal = document.getElementById("stripePaymentModal");
  if (modal) {
    modal.style.display = "none";
  }
  clearStripePaymentErrors();
  pendingStripeCheckout = null;
}

async function processStripePayment() {
  if (!pendingStripeCheckout) {
    await showAppAlert("No payment session found. Please start checkout again.", {
      title: "Session Missing",
      variant: "warning",
    });
    return;
  }
  if (!stripe || !stripeCardElement) {
    await showAppAlert("Stripe is not ready. Please refresh and try again.", {
      title: "Stripe Not Ready",
      variant: "error",
    });
    return;
  }
  if (stripePaymentInProgress) return;

  const payBtn = document.getElementById("stripePayBtn");
  stripePaymentInProgress = true;
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = "Processing...";
  }

  try {
    const cents = Math.round((pendingStripeCheckout.finalTotal || 0) * 100);
    if (cents <= 0) {
      throw new Error("Invalid payment amount.");
    }

    const response = await fetch(apiUrl("/api/create-payment-intent"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: cents,
        currency: "aud",
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };
    if (!response.ok || !payload.clientSecret) {
      throw new Error(
        payload.error || "Could not start Stripe payment. Please try again.",
      );
    }

    const result = await stripe.confirmCardPayment(payload.clientSecret, {
      payment_method: {
        card: stripeCardElement,
      },
    });

    if (result.error) {
      throw new Error(result.error.message || "Payment failed.");
    }

    if (!result.paymentIntent || result.paymentIntent.status !== "succeeded") {
      throw new Error("Payment was not completed.");
    }

    await completeCheckoutAfterPaymentSuccess(
      pendingStripeCheckout.ordersToSubmit,
      pendingStripeCheckout.finalTotal,
      result.paymentIntent.id,
      {
        source: "stripe_payment_intent",
        paymentIntentId: result.paymentIntent.id,
        paymentIntent: result.paymentIntent,
      },
    );
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Payment failed. Please try again.";
    renderStripePaymentErrors(message);
    await showAppAlert(`Payment failed: ${message}`, {
      title: "Payment Failed",
      variant: "error",
    });
  } finally {
    stripePaymentInProgress = false;
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Pay now";
    }
  }
}

async function completeCheckoutAfterPaymentSuccess(
  ordersToSubmit,
  finalTotal,
  stripeReferenceId,
  paymentDetails = {},
) {
  console.log("Checked out orders:", ordersToSubmit);
  console.log("Stripe payment reference:", stripeReferenceId);
  await onStripePaymentSuccess({
    ...paymentDetails,
    stripeReferenceId,
  }, ordersToSubmit, finalTotal);

  orderCart = [];
  saveCart();
  resetForm();
  closeCheckoutShippingModal();

  const paymentModal = document.getElementById("stripePaymentModal");
  if (paymentModal) {
    paymentModal.style.display = "none";
  }
  clearStripePaymentErrors();
  pendingStripeCheckout = null;

  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.style.display = "none";
  }
}

function finalizeCheckout(ordersToSubmit, finalTotal) {
  closeCheckoutShippingModal();
  startStripeHostedCheckout(ordersToSubmit, finalTotal);
}

async function confirmCheckoutWithSharedShipping() {
  const validationResult = validateCheckoutSharedShipping();
  if (!validationResult.isValid) {
    renderCheckoutShippingErrors(validationResult.errors);
    return;
  }

  const individualOrders = orderCart.filter(
    (order) => order.orderType === "individual",
  );
  const finalTotal = calculateCartTotal(validationResult.shippingPrice);
  const confirmed = await showAppConfirm(
    `You are about to submit ${orderCart.length} order(s).\nCheckout shipping adjustment for ${individualOrders.length} individual order(s): $${validationResult.shippingPrice.toFixed(2)}\nFinal total: $${finalTotal.toFixed(2)}\nDo you want to proceed?`,
    {
      title: "Confirm Checkout",
      confirmText: "Proceed to Payment",
      cancelText: "Review Cart",
      variant: "info",
    },
  );
  if (!confirmed) return;

  const ordersToSubmit = orderCart.map((order) => {
    if (order.orderType !== "individual") {
      return order;
    }

    return {
      ...order,
      deliveryName: validationResult.deliveryName,
      shippingAddress: validationResult.shippingAddress,
      shipping: validationResult.shipping,
      shippingPrice: 0,
      sharedShippingAtCheckout: true,
    };
  });

  finalizeCheckout(ordersToSubmit, finalTotal);
}

function validateCartOrdersHaveShipping() {
  const missing = [];
  orderCart.forEach((order) => {
    const details = order.shippingDetails || {};
    const hasAllDetails =
      !!order.deliveryName &&
      !!order.shipping &&
      !!details.streetNumber &&
      !!details.streetAddress1 &&
      !!details.suburb &&
      !!details.state &&
      !!details.postcode;

    if (!hasAllDetails) {
      missing.push(order.orderNumber || order.id || "?");
    }
  });

  return missing;
}

// Checkout all orders
async function checkout() {
  if (orderCart.length === 0) {
    await showAppAlert(
      "Your cart is empty. Please add at least one order before checkout.",
      {
        title: "Cart Is Empty",
        variant: "warning",
      },
    );
    return;
  }

  const ordersMissingShipping = validateCartOrdersHaveShipping();
  if (ordersMissingShipping.length > 0) {
    await showAppAlert(
      `Shipping details are incomplete for order(s): ${ordersMissingShipping.join(", ")}. Please edit each order and complete shipping before checkout.`,
      {
        title: "Shipping Required",
        variant: "warning",
      },
    );
    return;
  }

  const finalTotal = calculateCartTotal();
  const confirmed = await showAppConfirm(
    `You are about to submit ${orderCart.length} order(s).\nFinal total: $${finalTotal.toFixed(2)}\nDo you want to proceed?`,
    {
      title: "Confirm Checkout",
      confirmText: "Proceed to Payment",
      cancelText: "Review Cart",
      variant: "info",
    },
  );
  if (confirmed) {
    finalizeCheckout(orderCart, finalTotal);
  }
}

// Reset form for new order
function resetForm() {
  // Reset order data
  orderData = {
    orderType: "",
    depot: "",
    department: "",
    garment: "",
    garmentPrice: 0,
    decoration: "",
    decorationPrice: 0,
    logo: "",
    decorationName: "",
    nameApprovalChecked: false,
    decorationDepartment: "",
    personalizationItems: [],
    selectedSize: "",
    selectedSizeMetric: "",
    selectedQuantity: 1,
    totalGarmentPrice: 0,
    shipping: "",
    shippingPrice: 0,
    shippingDetails: {
      unitNumber: "",
      streetNumber: "",
      streetAddress1: "",
      streetAddress2: "",
      suburb: "",
      state: "",
      postcode: "",
    },
  };

  // Reset section 1
  document.querySelectorAll('input[name="orderType"]').forEach((input) => {
    const card = input.closest(".choiceCard");
    if (card) {
      card.classList.remove("choiceCard--selected");
    }
  });
  document.getElementById("depot").value = "";
  document.getElementById("deptSelectSection1").style.display = "none";
  document.getElementById("departmentSelect").value = "";

  // Reset section 2
  document.getElementById("garmentSelect").value = "";
  document.getElementById("garmentSelectionField").style.display = "block";
  document.getElementById("sizeSelectionGroup").style.display = "none";
  const sizeMetricSelect = document.getElementById("sizeMetricSelect");
  if (sizeMetricSelect) {
    sizeMetricSelect.innerHTML = '<option value="">Select measurement...</option>';
  }
  document.getElementById("sizeSelect").innerHTML =
    '<option value="">Select size...</option>';
  document.getElementById("quantityInput").value = "1";
  document.getElementById("priceSelectionGroup").style.display = "none";
  document.getElementById("priceDisplayGroup").style.display = "none";
  document.getElementById("decorationSelect").value = "";
  updateDecorationOptionsForGarment("");
  document.getElementById("logoSelectionGroup").style.display = "none";
  document.getElementById("logoSelect").value = "";
  document.getElementById("nameInputGroup").style.display = "none";
  document.getElementById("nameApprovalGroup").style.display = "none";
  document.getElementById("decorationNameInput").value = "";
  document.getElementById("nameApprovalChecked").checked = false;
  document.getElementById("deptSelectionGroup").style.display = "none";
  document.getElementById("decorationDeptSelect").value = "";
  document.getElementById("decorationSelect").disabled = false;
  const quantityField = document.getElementById("quantityField");
  if (quantityField) {
    quantityField.style.display = "block";
  }
  const personalizationContainer = document.getElementById("personalizationItems");
  if (personalizationContainer) {
    personalizationContainer.innerHTML = "";
  }
  personalizationCount = 0;

  // Reset section 3
  resetPerOrderShippingState();
  document.getElementById("confirmChecked").checked = false;
  const orderSummaryContent = document.getElementById("orderSummaryContent");
  if (orderSummaryContent) {
    orderSummaryContent.innerHTML = "";
  }
  const personalizationReviewList = document.getElementById(
    "personalizationReviewList",
  );
  if (personalizationReviewList) {
    personalizationReviewList.innerHTML = "";
  }
  clearAddToCartErrors();

  // Go to section 1
  setActiveSection(1);

  // Disable continue buttons
  document.getElementById("next1").disabled = true;
  document.getElementById("next2").disabled = true;
  updateSection3ShippingUI();
  syncDepartmentBulkUI();
  updateFinalTotal();
  renderLiveSummaryPanel();

  window.scrollTo({ top: 0, behavior: "smooth" });
}
