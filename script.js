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
};

// Order cart to store multiple orders (load from localStorage)
let orderCart = JSON.parse(localStorage.getItem('garmentOrderCart')) || [];
const SHIPPING_PRICES = {
  small: 15.5,
  medium: 18.0,
  large: 20.0,
  xl: 25.0,
  freight: 12.0,
};
const INDIVIDUAL_SHIPPING_NOTE = "Shipping collected at checkout";
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

// Initialize cart on page load
function initCart() {
  updateCartBadge();
  renderCartDropdown();
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('garmentOrderCart', JSON.stringify(orderCart));
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
    ? order.personalizationItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      )
    : Math.max(parseInt(order.selectedQuantity, 10) || 1, 1);
  const garmentTotal =
    typeof order.totalGarmentPrice === "number"
      ? order.totalGarmentPrice
      : (order.garmentPrice || 0) * totalQuantity;
  const decorationTotal = (order.decorationPrice || 0) * totalQuantity;
  const shippingTotal =
    order.orderType === "department" ? (order.shippingPrice || 0) : 0;

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
  const hasIndividualOrders = orderCart.some(
    (order) => order.orderType === "individual",
  );
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
    summaryShippingNote.textContent = hasIndividualOrders
      ? "Shared shipping for individual orders is collected at checkout."
      : "";
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
    drawerNote.textContent = hasIndividualOrders
      ? "Shared shipping for individual orders is applied during checkout."
      : "";
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
  const qty = orderData.personalizationItems.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );
  const garmentTotal =
    typeof orderData.totalGarmentPrice === "number"
      ? orderData.totalGarmentPrice
      : (orderData.garmentPrice || 0) * qty;
  const decoTotal = (orderData.decorationPrice || 0) * qty;
  const shippingTotal =
    orderData.orderType === "department" ? orderData.shippingPrice || 0 : 0;
  const draftTotal = garmentTotal + decoTotal + shippingTotal;

  mount.innerHTML = `
    <div class="summaryLine">
      <span class="summaryLine__k">Type</span>
      <span class="summaryLine__v">${orderData.orderType ? (orderData.orderType === "department" ? "Department" : "Individual") : "Not selected"}</span>
    </div>
    <div class="summaryLine">
      <span class="summaryLine__k">Garment</span>
      <span class="summaryLine__v">${orderData.garment ? getGarmentName(orderData.garment) : "Not selected"}</span>
    </div>
    <div class="summaryLine">
      <span class="summaryLine__k">Decoration</span>
      <span class="summaryLine__v">${orderData.decoration ? getDecorationName(orderData.decoration) : "Not selected"}</span>
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

    quickHtml += `
      <div class="quickItem">
        <div class="quickItem__top">
          <div class="quickItem__title">Order #${order.orderNumber} (${typeLabel})</div>
          <div class="money">$${orderTotal.toFixed(2)}</div>
        </div>
        <div class="quickItem__meta">
          <div>${getGarmentName(order.garment)}</div>
          <div>${getDecorationName(order.decoration)}</div>
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
          <div class="drawerItem__title">Order #${order.orderNumber} (${typeLabel})</div>
          <div class="money">$${orderTotal.toFixed(2)}</div>
        </div>
        <div class="drawerItem__meta">
          <div>${getGarmentName(order.garment)}</div>
          <div>${getDecorationName(order.decoration)}</div>
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
  // Validate section 2 before proceeding (garment and decoration must be selected)
  if (current === 2) {
    if (!orderData.garment) {
      alert("Please select a garment type");
      return;
    }
    if (!orderData.decoration) {
      alert("Please select a decoration option");
      return;
    }
    // Validate decoration-specific fields
    if (orderData.decoration === "logo-only" || orderData.decoration === "logo-name") {
      if (!orderData.logo) {
        alert("Please select a logo");
        return;
      }
    }
    if (orderData.decoration === "logo-name" || orderData.decoration === "name-only" || orderData.decoration === "dept-name") {
      if (!orderData.decorationName || orderData.decorationName.trim() === "") {
        alert("Please enter the individual person's name");
        return;
      }
      if (!orderData.nameApprovalChecked) {
        alert("Please confirm the cost centre approval disclaimer.");
        return;
      }
    }
    if (orderData.decoration === "dept-only" || orderData.decoration === "dept-name") {
      if (!orderData.decorationDepartment) {
        alert("Please select a department");
        return;
      }
    }
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

  const deliveryNameSelect = document.getElementById("deliveryNameSelect");
  if (deliveryNameSelect) {
    deliveryNameSelect.value = "";
  }

  const shippingAddressInput = document.getElementById("shippingAddress");
  if (shippingAddressInput) {
    shippingAddressInput.value = "";
  }

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

  if (!hasOrderType) {
    if (departmentShippingFields) {
      departmentShippingFields.style.display = "none";
    }
    if (individualShippingNotice) {
      individualShippingNotice.style.display = "none";
    }
    return;
  }

  const isDepartmentOrder = orderData.orderType === "department";

  if (departmentShippingFields) {
    departmentShippingFields.style.display = isDepartmentOrder ? "block" : "none";
  }
  if (individualShippingNotice) {
    individualShippingNotice.style.display = isDepartmentOrder ? "none" : "block";
  }
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
    resetPerOrderShippingState();
  }

  updateSection3ShippingUI();
  updateFinalTotal();
  clearAddToCartErrors();
  validateSection1();
  renderLiveSummaryPanel();
}

function selectDepot() {
  const selectedValue = document.getElementById("depot").value;
  orderData.depot = selectedValue; // For individual orders, store as depot
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

  document.getElementById("next1").disabled = !(
    orderData.orderType &&
    selectionMade &&
    deptSelected
  );
}

// App wiring
document.addEventListener("DOMContentLoaded", async function () {
  initCart();
  await loadStripeConfig();
  initStripe();
  updateSection3ShippingUI();
  setActiveSection(1);
  validateSection1();
  validateSection2();
  updateFinalTotal();
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
    deliveryNameSelect.addEventListener("input", clearAddToCartErrors);
  }

  const shippingAddressInput = document.getElementById("shippingAddress");
  if (shippingAddressInput) {
    shippingAddressInput.addEventListener("input", clearAddToCartErrors);
  }

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

  document.querySelectorAll('input[name="checkoutShipping"]').forEach((input) => {
    input.addEventListener("change", function () {
      selectCheckoutShipping(this.value, this.closest(".shipOption"));
    });
  });

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
      name: "Mens Polo JB210",
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
    populateSizeMetricOptions(selectedGarmentInfo);
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
    "name-only": 8.0,
    "logo-name": 12.0,
    "logo-only": 9.5,
    "dept-only": 8.5,
    "dept-name": 9.5,
  };

  orderData.decorationPrice = prices[decoration];

  // Show/hide fields based on decoration type
  const logoSelectionGroup = document.getElementById("logoSelectionGroup");
  const nameInputGroup = document.getElementById("nameInputGroup");
  const deptSelectionGroup = document.getElementById("deptSelectionGroup");

  // Reset all fields
  logoSelectionGroup.style.display = "none";
  nameInputGroup.style.display = "none";
  deptSelectionGroup.style.display = "none";

  // Logo only: show logo dropdown
  if (decoration === "logo-only") {
    logoSelectionGroup.style.display = "block";
  }
  // Logo + Name: show logo dropdown + name input
  else if (decoration === "logo-name") {
    logoSelectionGroup.style.display = "block";
    nameInputGroup.style.display = "block";
  }
  // Name only: show name input only
  else if (decoration === "name-only") {
    nameInputGroup.style.display = "block";
  }
  // Department only: show department dropdown
  else if (decoration === "dept-only") {
    deptSelectionGroup.style.display = "block";
  }
  // Department + Name: show department dropdown + name input
  else if (decoration === "dept-name") {
    deptSelectionGroup.style.display = "block";
    nameInputGroup.style.display = "block";
  }

  // Clear values when switching decoration types
  if (decoration !== "logo-only" && decoration !== "logo-name") {
    document.getElementById("logoSelect").value = "";
    orderData.logo = "";
  }
  if (decoration !== "dept-only" && decoration !== "dept-name") {
    document.getElementById("decorationDeptSelect").value = "";
    orderData.decorationDepartment = "";
  }
  if (
    decoration !== "logo-name" &&
    decoration !== "name-only" &&
    decoration !== "dept-name"
  ) {
    document.getElementById("decorationNameInput").value = "";
    orderData.decorationName = "";
    const nameApprovalCheckbox = document.getElementById("nameApprovalChecked");
    if (nameApprovalCheckbox) {
      nameApprovalCheckbox.checked = false;
    }
    orderData.nameApprovalChecked = false;
  }

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
  validateSection2();
}

// Validate section 2 (garment and decoration)
function validateSection2() {
  const decoration = orderData.decoration;
  let isValid = false;

  if (decoration === "logo-only") {
    isValid = orderData.logo && orderData.logo !== "";
  } else if (decoration === "logo-name") {
    isValid =
      orderData.logo &&
      orderData.logo !== "" &&
      orderData.decorationName &&
      orderData.decorationName.trim() !== "" &&
      orderData.nameApprovalChecked;
  } else if (decoration === "name-only") {
    isValid =
      orderData.decorationName &&
      orderData.decorationName.trim() !== "" &&
      orderData.nameApprovalChecked;
  } else if (decoration === "dept-only") {
    isValid =
      orderData.decorationDepartment && orderData.decorationDepartment !== "";
  } else if (decoration === "dept-name") {
    isValid =
      orderData.decorationDepartment &&
      orderData.decorationDepartment !== "" &&
      orderData.decorationName &&
      orderData.decorationName.trim() !== "" &&
      orderData.nameApprovalChecked;
  }

  // Enable next2 button if garment, size, and decoration are valid
  const garmentSelected = orderData.garment && orderData.garment !== "";
  const sizeSelected = orderData.selectedSize && orderData.selectedSize !== "";
  document.getElementById("next2").disabled = !(garmentSelected && sizeSelected && isValid);
}

// Section 4: Personalization Items
function initializePersonalizationSection() {
  if (personalizationCount === 0) {
    addPersonalizationItem();
  }
}

function addPersonalizationItem() {
  personalizationCount++;
  const container = document.getElementById("personalizationItems");

  // Determine what fields to show based on decoration type
  const decoration = orderData.decoration;
  const needsDept = decoration === "dept-only" || decoration === "dept-name";

  // Build department field (only for dept-only and dept-name decorations)
  let deptHTML = "";
  if (needsDept) {
    deptHTML += `<div class="form-group">
        <label class="form-label required">Department Name <span style="font-weight:400;">(if you are unsure please ask your supervisor)</span></label>
        <select class="select-input" data-field="department" data-person="${personalizationCount}">
          <option value="">Select department...</option>
          <option value="Asset and Operational Excellence">Asset and Operational Excellence</option>
          <option value="Asset Engineering">Asset Engineering</option>
          <option value="Assets & Operations Management">Assets & Operations Management</option>
          <option value="Coastal Operations">Coastal Operations</option>
          <option value="Commercial Design">Commercial Design</option>
          <option value="Commercial Services">Commercial Services</option>
          <option value="Contestable Network Solutions">Contestable Network Solutions</option>
          <option value="Contract Management Capability Program">Contract Management Capability Program</option>
          <option value="Customer & Commerical">Customer & Commerical</option>
          <option value="Design Services">Design Services</option>
          <option value="Devops">Devops</option>
          <option value="Digital Asset Management">Digital Asset Management</option>
          <option value="Digital Delivery">Digital Delivery</option>
          <option value="Digital Services">Digital Services</option>
          <option value="Electric Vehicle Transition">Electric Vehicle Transition</option>
          <option value="Electrical Safety Office">Electrical Safety Office</option>
          <option value="Finance Division">Finance Division</option>
          <option value="Fleet Team">Fleet Team</option>
          <option value="Frontline Mobility">Frontline Mobility</option>
          <option value="Future Networks">Future Networks</option>
          <option value="Governance & Corporate Services">Governance & Corporate Services</option>
          <option value="Graduate Program">Graduate Program</option>
          <option value="Innovation Team">Innovation Team</option>
          <option value="Inventory & Logistics">Inventory & Logistics</option>
          <option value="Learning & Capability">Learning & Capability</option>
          <option value="Location + Midnorth Coast Operations">Location + Midnorth Coast Operations</option>
          <option value="Major Projects and Transmission">Major Projects and Transmission</option>
          <option value="Major Projects and Transmission Services">Major Projects and Transmission Services</option>
          <option value="Meter 2 Cash">Meter 2 Cash</option>
          <option value="Midnorth Coast Operations">Midnorth Coast Operations</option>
          <option value="MSM Team">MSM Team</option>
          <option value="Murray Operations">Murray Operations</option>
          <option value="Network Design">Network Design</option>
          <option value="Network Development">Network Development</option>
          <option value="Network Investment and Maintenance">Network Investment and Maintenance</option>
          <option value="Network Planning">Network Planning</option>
          <option value="Network Planning and Development">Network Planning and Development</option>
          <option value="Network Services">Network Services</option>
          <option value="Network Substation and Design">Network Substation and Design</option>
          <option value="North West Operations">North West Operations</option>
          <option value="Operational Services">Operational Services</option>
          <option value="Operations">Operations</option>
          <option value="Outage Management Group">Outage Management Group</option>
          <option value="People & Safety">People & Safety</option>
          <option value="People Operations and Planning">People Operations and Planning</option>
          <option value="Portfolio Services">Portfolio Services</option>
          <option value="Procurement">Procurement</option>
          <option value="Property">Property</option>
          <option value="Riverina Slopes">Riverina Slopes</option>
          <option value="South Eastern Operations">South Eastern Operations</option>
          <option value="Strategy and Future Networks">Strategy and Future Networks</option>
          <option value="Telbu">Telbu</option>
          <option value="Transmission Services">Transmission Services</option>
          <option value="Vegatation Operations">Vegatation Operations</option>
          <option value="Works Delivery & Specilised Services">Works Delivery & Specilised Services</option>
          <option value="Zone Substation Engineering">Zone Substation Engineering</option>
          <option value="other">Other (please note - you will need prior approval if your department is not listed)</option>
        </select>
      </div>`;
  }

  // Name field is always shown for all decoration types
  const nameHTML = `<div class="form-group">
        <label class="form-label required">Individual Person's Name</label>
        <input type="text" class="text-input" placeholder="Enter name" data-field="name" data-person="${personalizationCount}">
      </div>`;

  const itemHTML = `
    <div class="personalization-item" id="person-${personalizationCount}">
      <div class="personalization-header">
        <span class="item-number">Person #${personalizationCount}</span>
        ${personalizationCount > 1 ? `<button class="remove-btn" onclick="removePersonalizationItem(${personalizationCount})">Remove</button>` : ""}
      </div>
      ${deptHTML}
      ${nameHTML}
      <div class="form-group">
        <label class="form-label required">Quantity</label>
        <input type="number" class="number-input" min="1" value="1" data-field="quantity" data-person="${personalizationCount}" oninput="updateGarmentPriceBasedOnQuantity()">
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", itemHTML);
}

function removePersonalizationItem(id) {
  document.getElementById(`person-${id}`).remove();
  orderData.personalizationItems = orderData.personalizationItems.filter(
    (item) => item.id !== id,
  );
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

  const personalizationRows = document.querySelectorAll(".personalization-item");
  if (personalizationRows.length === 0) {
    orderData.personalizationItems.push({
      id: "1",
      department: orderData.decorationDepartment || "",
      name: orderData.decorationName || "",
      size: selectedSize,
      quantity: selectedQuantity,
    });
    return;
  }

  personalizationRows.forEach((item) => {
    const personId = item.id.split("-")[1];
    const rowQuantity = Math.max(
      parseInt(item.querySelector('[data-field="quantity"]')?.value, 10) ||
        selectedQuantity,
      1,
    );

    orderData.personalizationItems.push({
      id: personId,
      department: item.querySelector('[data-field="department"]')?.value || "",
      name: item.querySelector('[data-field="name"]')?.value || "",
      size: selectedSize,
      quantity: rowQuantity,
    });
  });
}

// Function to update garment price based on total quantity ordered
function updateGarmentPriceBasedOnQuantity() {
  // Collect current personalization data to get updated quantities
  collectPersonalizationData();

  // Get the selected price tier from the dropdown
  const priceTierSelect = document.getElementById("priceTierSelect");
  const selectedPriceTier = priceTierSelect ? priceTierSelect.value : "";

  // If no price tier is selected, use the automatic calculation
  if (!selectedPriceTier) {
    // Calculate total quantity across all personalization items
    const totalQuantity = orderData.personalizationItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    // Determine the price tier based on total quantity
    let priceTier;
    if (totalQuantity >= 100) {
      priceTier = "100+";
    } else if (totalQuantity >= 50) {
      priceTier = "50-99";
    } else if (totalQuantity >= 25) {
      priceTier = "25-49";
    } else {
      priceTier = "1-24";
    }

    // Update the price tier dropdown to reflect the automatic selection
    if (priceTierSelect) {
      priceTierSelect.value = priceTier;
    }

    // Use the automatic price tier
    updateGarmentPriceWithTier(priceTier);
  } else {
    // Use the manually selected price tier
    updateGarmentPriceWithTier(selectedPriceTier);
  }

  // Update the order summary if we're on that section
  if (currentSection === 3) {
    generateOrderSummary();
  }

  // Ensure the price input (if visible) reflects the latest computed price
  updatePriceDisplay();
}

// Helper function to update garment price with a specific tier
function updateGarmentPriceWithTier(priceTier) {
  const validTiers = ["1-24", "25-49", "50-99", "100+"];
  let normalizedPriceTier = priceTier;
  if (!validTiers.includes(normalizedPriceTier || "")) {
    const matchedTier = validTiers.find((tier) =>
      (normalizedPriceTier || "").endsWith(tier),
    );
    normalizedPriceTier = matchedTier || "1-24";
  }

  // Update the garment price based on the selected garment and quantity tier
  if (orderData.garment) {
    // Use the simplified garmentInfo structure as specified
    const garmentInfo = {
      "mens-polo-xs-5xl": {
        name: "Mens Polo 1065",
      },
      "mens-polo-5xl-10xl": {
        name: "Mens Polo JB210",
      },
      "womens-polo-xs-2xl": {
        name: "Ladies Polo JH201W",
      },
      "womens-polo-20-26": {
        name: "Ladies Polo 1165",
      },
      "premium-unisex-tech-jacket-2xl-5xl": {
        name: "Podium Unisex Tech Jacket",
        prices: {
          "1-24": 93.0,
          "25-49": 88.35,
          "50-99": 86.0,
          "100+": 79.1,
        },
      },
      "mens-olympus-softshell-jacket-s-8xl": {
        name: "Mens Olympus Softshell Jacket",
        prices: {
          "1-24": 68.0,
          "25-49": 64.5,
          "50-99": 62.9,
          "100+": 57.8,
        },
        // Additional pricing based on size ranges
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
        prices: {
          "1-24": 73.5,
          "25-49": 69.85,
          "50-99": 68.0,
          "100+": 62.5,
        },
        // Additional pricing based on size ranges
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

    if (garmentInfo[orderData.garment]) {
      if (!garmentInfo[orderData.garment].prices) {
        orderData.garmentPrice = 0;
        orderData.totalGarmentPrice = 0;
        updatePriceDisplay();
        return;
      }

      // Check if this garment has size-range specific pricing
      if (garmentInfo[orderData.garment].sizeRangePrices) {
        // Calculate the total price based on individual selections
        let totalPrice = 0;
        let itemCount = 0;

        orderData.personalizationItems.forEach((item) => {
          if (item.size) {
            itemCount += item.quantity;

            // Determine which size range this size belongs to
            let applicablePrice =
              garmentInfo[orderData.garment].prices[normalizedPriceTier]; // fallback

            // For mens-olympus-softshell-jacket-s-8xl
            // Sizes: S, M, L, XL, XXL, 3XL, 5XL, 6XL, 7XL, 8XL
            // S-5XL includes: S, M, L, XL, XXL, 3XL, 5XL
            // 6XL-8XL includes: 6XL, 7XL, 8XL
            if (orderData.garment === "mens-olympus-softshell-jacket-s-8xl") {
              const sTo5xlSizes = ["S", "M", "L", "XL", "XXL", "3XL", "5XL"];
              const sixXlTo8xlSizes = ["6XL", "7XL", "8XL"];

              if (sTo5xlSizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["S-5XL"][
                    normalizedPriceTier
                  ];
              } else if (sixXlTo8xlSizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["6XL-8XL"][
                    normalizedPriceTier
                  ];
              }
            }
            // For ladies-olympus-softshell-jacket-8-26
            // Sizes: 8, 10, 12, 14, 16, 18, 20, 22, 24, 26
            // 8-22 includes: 8, 10, 12, 14, 16, 18, 20, 22
            // 24-26 includes: 24, 26
            else if (
              orderData.garment === "ladies-olympus-softshell-jacket-8-26"
            ) {
              const eightTo22Sizes = [
                "8",
                "10",
                "12",
                "14",
                "16",
                "18",
                "20",
                "22",
              ];
              const twentyFourTo26Sizes = ["24", "26"];

              if (eightTo22Sizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["8-22"][
                    normalizedPriceTier
                  ];
              } else if (twentyFourTo26Sizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["24-26"][
                    normalizedPriceTier
                  ];
              }
            }

            // Add the price for this specific item to the total
            totalPrice += applicablePrice * item.quantity;
          }
        });

        // Store the total price for the garments
        orderData.totalGarmentPrice = totalPrice;

        // Calculate average price per unit for display purposes
        if (itemCount > 0) {
          orderData.garmentPrice = totalPrice / itemCount;
        } else {
          orderData.garmentPrice =
            garmentInfo[orderData.garment].prices[normalizedPriceTier];
        }
      } else {
        // Standard pricing (not dependent on size ranges)
        orderData.garmentPrice =
          garmentInfo[orderData.garment].prices[normalizedPriceTier];
        orderData.totalGarmentPrice =
          orderData.garmentPrice *
          orderData.personalizationItems.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0,
          );
      }
    }
  }

  // Ensure price display reflects the final calculated price
  updatePriceDisplay();
}

// Section 5: Order Summary
function generateOrderSummary() {
  collectPersonalizationData();
  updateSection3ShippingUI();

  const container = document.getElementById("orderSummaryContent");
  if (!container) {
    updateFinalTotal();
    return;
  }

  const depotSelect = document.getElementById("depot");
  const depotText =
    depotSelect && depotSelect.selectedIndex >= 0
      ? depotSelect.options[depotSelect.selectedIndex].text
      : "Not selected";

  const totalQuantity = orderData.personalizationItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const garmentTotal =
    typeof orderData.totalGarmentPrice === "number"
      ? orderData.totalGarmentPrice
      : (orderData.garmentPrice || 0) * totalQuantity;
  const decorationTotal = (orderData.decorationPrice || 0) * totalQuantity;
  const shippingTotal =
    orderData.orderType === "department" ? orderData.shippingPrice || 0 : 0;
  const grandTotal = garmentTotal + decorationTotal + shippingTotal;

  const rows = [
    ["Order type", orderData.orderType ? (orderData.orderType === "department" ? "Department" : "Individual") : "Not selected"],
    ["Cost centre", depotText],
    ["Garment", getGarmentName(orderData.garment)],
    ["Decoration", getDecorationName(orderData.decoration)],
    ["Quantity", `${totalQuantity} items`],
    ["Garment cost", `$${garmentTotal.toFixed(2)}`],
    ["Decoration cost", `$${decorationTotal.toFixed(2)}`],
  ];

  if (orderData.orderType === "department") {
    rows.push(["Shipping", `$${shippingTotal.toFixed(2)}`]);
  } else {
    rows.push(["Shipping", "Collected at checkout"]);
  }

  if (orderData.decorationName) {
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
        `<div class="reviewRow"><span class="reviewKey">${key}</span><span>${value}</span></div>`,
    )
    .join("");

  updateFinalTotal();
}

// Allow editing individual personalizations from review
function editPersonalization(id) {
  // go back to personalization section
  prevSection(3);
  // ensure personalization items exist; rebuild from orderData if needed
  const container = document.getElementById("personalizationItems");
  if (!document.getElementById(`person-${id}`)) {
    // clear and rebuild items
    container.innerHTML = "";
    personalizationCount = 0;
    orderData.personalizationItems.forEach((p) => {
      addPersonalizationItem();
      // fill values into the last added item
      const item = document.querySelector(`#person-${personalizationCount}`);
      if (p.department)
        item.querySelector('[data-field="department"]').value = p.department;
      if (p.name) item.querySelector('[data-field="name"]').value = p.name;
    });
  }

  // Set the global size and quantity inputs
  if (orderData.selectedSize) {
    document.getElementById("sizeSelect").value = orderData.selectedSize;
  }
  if (orderData.selectedQuantity) {
    document.getElementById("quantityInput").value = orderData.selectedQuantity;
  }

  // focus the fields for the requested person
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
    "mens-polo-5xl-10xl": "Mens Polo JB210 (6XL - 10XL)",
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
    "name-only": "Individual name only (RHC)",
    "logo-name": "Logo & individual name (RHC)",
    "logo-only": "Logo only (RHC)",
    "dept-only": "Department name only",
    "dept-name": "Department & individual name",
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

function selectCheckoutShipping(type, element) {
  checkoutShippingData.shipping = type;
  checkoutShippingData.shippingPrice = SHIPPING_PRICES[type] || 0;

  const selectedInput = document.querySelector(
    `input[name="checkoutShipping"][value="${type}"]`,
  );
  if (selectedInput) {
    selectedInput.checked = true;
  }

  let selectedOption = element;
  if (!selectedOption && selectedInput) {
    selectedOption = selectedInput.closest(".shipOption");
  }

  document.querySelectorAll('input[name="checkoutShipping"]').forEach((input) => {
    const option = input.closest(".shipOption");
    if (option) {
      option.classList.remove("shipOption--selected");
    }
  });

  if (selectedOption) {
    selectedOption.classList.add("shipOption--selected");
  }

  clearCheckoutShippingErrors();
  updateCheckoutModalTotals(checkoutShippingData.shippingPrice);
}

function updateFinalTotal() {
  collectPersonalizationData();

  const totalQuantity = orderData.personalizationItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const garmentTotal =
    typeof orderData.totalGarmentPrice === "number"
      ? orderData.totalGarmentPrice
      : orderData.garmentPrice * totalQuantity;
  const decorationTotal = orderData.decorationPrice * totalQuantity;
  const shippingTotal =
    orderData.orderType === "department" ? orderData.shippingPrice : 0;
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
  const isDepartmentOrder = orderData.orderType === "department";
  const requiresNameApproval =
    orderData.decoration === "logo-name" ||
    orderData.decoration === "name-only" ||
    orderData.decoration === "dept-name";
  const confirmed =
    document.getElementById("confirmChecked") &&
    document.getElementById("confirmChecked").checked;

  if (isDepartmentOrder) {
    const deliveryName = document.getElementById("deliveryNameSelect").value.trim();
    const address = document.getElementById("shippingAddress").value.trim();

    if (!deliveryName) {
      errors.push("Please enter a name on delivery.");
    }

    if (!address) {
      errors.push("Please enter a shipping address.");
    }

    if (!orderData.shipping) {
      errors.push("Please select a shipping option.");
    }
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

  const isDepartmentOrder = orderData.orderType === "department";
  const deliveryName = isDepartmentOrder
    ? document.getElementById("deliveryNameSelect").value.trim()
    : INDIVIDUAL_SHIPPING_NOTE;
  const address = isDepartmentOrder
    ? document.getElementById("shippingAddress").value.trim()
    : "";
  const shippingType = isDepartmentOrder ? orderData.shipping : "";
  const shippingPrice = isDepartmentOrder ? orderData.shippingPrice : 0;

  // Save current order to cart
  const orderCopy = JSON.parse(JSON.stringify(orderData));
  orderCopy.deliveryName = deliveryName;
  orderCopy.shippingAddress = address;
  orderCopy.shipping = shippingType;
  orderCopy.shippingPrice = shippingPrice;
  orderCopy.orderNumber = orderCart.length + 1;
  orderCopy.id = Date.now(); // Unique ID for editing
  orderCart.push(orderCopy);

  // Save to localStorage
  saveCart();

  // Reset form for new order
  resetForm();
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.style.display = "none";
  }
  showSuccessToast(
    isDepartmentOrder
      ? "Department order added to cart. You can add another order now."
      : "Individual order added to cart. Shipping will be entered at checkout.",
  );
}

// Remove order from cart
function removeFromCart(index) {
  if (confirm("Are you sure you want to remove this order from the cart?")) {
    orderCart.splice(index, 1);
    // Renumber orders
    orderCart.forEach((order, i) => {
      order.orderNumber = i + 1;
    });
    saveCart();
  }
}

// Clear entire cart
function clearCart() {
  if (confirm("Are you sure you want to clear all orders from the cart?")) {
    orderCart = [];
    saveCart();
    const drawer = document.getElementById("cartDrawer");
    if (drawer) {
      drawer.style.display = "none";
    }
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
    shippingPrice:
      order.orderType === "department" ? (order.shippingPrice || 0) : 0,
  };

  // Populate form fields
  const orderTypeRadio = document.querySelector(`input[name="orderType"][value="${order.orderType}"]`);
  if (orderTypeRadio) {
    const card = orderTypeRadio.closest(".choiceCard");
    if (card) {
      card.classList.add("choiceCard--selected");
    }
  }
  document.getElementById("depot").value = order.depot;

  // Show/hide department field based on order type
  if (order.orderType === "department") {
    document.getElementById("deptSelectSection1").style.display = "block";
    document.getElementById("departmentSelect").value = order.department;

    document.getElementById("deliveryNameSelect").value = order.deliveryName || "";
    document.getElementById("shippingAddress").value = order.shippingAddress || "";
    if (order.shipping) {
      selectShipping(order.shipping);
    } else {
      resetPerOrderShippingState();
    }
  } else {
    document.getElementById("deptSelectSection1").style.display = "none";
    resetPerOrderShippingState();
  }
  updateSection3ShippingUI();

  // Set garment
  document.getElementById("garmentSelect").value = order.garment;
  selectGarment(order.garment);

  // Set decoration
  document.getElementById("decorationSelect").value = order.decoration;
  selectDecoration(order.decoration);
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
  if (order.decorationName) {
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
    summary.textContent = `Cart has ${orderSummary}. Current total before shared individual shipping: $${calculateCartTotal().toFixed(2)}.`;
  }

  checkoutShippingData = {
    shipping: "",
    shippingPrice: 0,
  };
  document.getElementById("checkoutDeliveryNameSelect").value = "";
  document.getElementById("checkoutShippingAddress").value = "";
  document.querySelectorAll('input[name="checkoutShipping"]').forEach((input) => {
    input.checked = false;
    const option = input.closest(".shipOption");
    if (option) {
      option.classList.remove("shipOption--selected");
    }
  });
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
    const response = await fetch("/api/config", {
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

function initStripe() {
  if (stripe && stripeCardElement) return true;

  if (!stripePublishableKey) {
    return false;
  }
  if (typeof window.Stripe !== "function") {
    return false;
  }

  stripe = window.Stripe(stripePublishableKey);
  const cardMount = document.getElementById("stripeCardElement");
  if (!cardMount) return false;

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

  return true;
}

function openStripePaymentModal(ordersToSubmit, finalTotal) {
  const modal = document.getElementById("stripePaymentModal");
  const amountText = document.getElementById("stripePayAmount");

  if (!modal || !amountText) return;

  if (!initStripe()) {
    alert("Unable to load Stripe. Please refresh and try again.");
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
    alert("No payment session found. Please start checkout again.");
    return;
  }
  if (!stripe || !stripeCardElement) {
    alert("Stripe is not ready. Please refresh and try again.");
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

    const response = await fetch("/api/create-payment-intent", {
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

    completeCheckoutAfterPaymentSuccess(
      pendingStripeCheckout.ordersToSubmit,
      pendingStripeCheckout.finalTotal,
      result.paymentIntent.id,
    );
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "Payment failed. Please try again.";
    renderStripePaymentErrors(message);
    alert(`Payment failed: ${message}`);
  } finally {
    stripePaymentInProgress = false;
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Pay now";
    }
  }
}

function completeCheckoutAfterPaymentSuccess(
  ordersToSubmit,
  finalTotal,
  paymentIntentId,
) {
  console.log("Checked out orders:", ordersToSubmit);
  console.log("Stripe payment intent:", paymentIntentId);

  alert(`Payment successful. Final total: $${finalTotal.toFixed(2)}.`);

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
  openStripePaymentModal(ordersToSubmit, finalTotal);
}

function confirmCheckoutWithSharedShipping() {
  const validationResult = validateCheckoutSharedShipping();
  if (!validationResult.isValid) {
    renderCheckoutShippingErrors(validationResult.errors);
    return;
  }

  const individualOrders = orderCart.filter(
    (order) => order.orderType === "individual",
  );
  const finalTotal = calculateCartTotal(validationResult.shippingPrice);
  const confirmed = confirm(
    `You are about to submit ${orderCart.length} order(s).\nShared shipping for ${individualOrders.length} individual order(s): $${validationResult.shippingPrice.toFixed(2)}\nFinal total: $${finalTotal.toFixed(2)}\nDo you want to proceed?`,
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

// Checkout all orders
function checkout() {
  if (orderCart.length === 0) {
    alert("Your cart is empty. Please add at least one order before checkout.");
    return;
  }

  const hasIndividualOrders = orderCart.some(
    (order) => order.orderType === "individual",
  );
  if (hasIndividualOrders) {
    openCheckoutShippingModal();
    return;
  }

  const finalTotal = calculateCartTotal();
  const confirmed = confirm(
    `You are about to submit ${orderCart.length} order(s).\nFinal total: $${finalTotal.toFixed(2)}\nDo you want to proceed?`,
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
  document.getElementById("sizeSelectionGroup").style.display = "none";
  document.getElementById("sizeMetricSelect").innerHTML =
    '<option value="">Select measurement...</option>';
  document.getElementById("sizeSelect").innerHTML =
    '<option value="">Select size...</option>';
  document.getElementById("quantityInput").value = "1";
  document.getElementById("priceSelectionGroup").style.display = "none";
  document.getElementById("priceDisplayGroup").style.display = "none";
  document.getElementById("decorationSelect").value = "";
  document.getElementById("logoSelectionGroup").style.display = "none";
  document.getElementById("logoSelect").value = "";
  document.getElementById("nameInputGroup").style.display = "none";
  document.getElementById("decorationNameInput").value = "";
  document.getElementById("nameApprovalChecked").checked = false;
  document.getElementById("deptSelectionGroup").style.display = "none";
  document.getElementById("decorationDeptSelect").value = "";

  // Reset section 3
  resetPerOrderShippingState();
  document.getElementById("confirmChecked").checked = false;
  clearAddToCartErrors();

  // Go to section 1
  setActiveSection(1);

  // Disable continue buttons
  document.getElementById("next1").disabled = true;
  document.getElementById("next2").disabled = true;
  updateSection3ShippingUI();
  updateFinalTotal();
  renderLiveSummaryPanel();

  window.scrollTo({ top: 0, behavior: "smooth" });
}
