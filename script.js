// Global state
let orderData = {
  orderType: "",
  depot: "",
  department: "",
  garment: "",
  garmentPrice: 0,
  decoration: "",
  decorationPrice: 0,
  digitisingFee: 0,
  personalizationItems: [],
  shipping: "",
  shippingPrice: 0,
};

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

// Section navigation
function nextSection(current) {
  document.getElementById(`section${current}`).classList.remove("active");
  document.getElementById(`step${current}`).classList.remove("active");
  document.getElementById(`step${current}`).classList.add("completed");

  currentSection = current + 1;
  document.getElementById(`section${currentSection}`).classList.add("active");
  document.getElementById(`step${currentSection}`).classList.add("active");

  if (currentSection === 4) {
    initializePersonalizationSection();
  }

  if (currentSection === 5) {
    generateOrderSummary();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function prevSection(current) {
  document.getElementById(`section${current}`).classList.remove("active");
  document.getElementById(`step${current}`).classList.remove("active");

  currentSection = current - 1;
  document.getElementById(`section${currentSection}`).classList.add("active");
  document
    .getElementById(`step${currentSection}`)
    .classList.remove("completed");
  document.getElementById(`step${currentSection}`).classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Section 1: Order Type & Depot
function selectOrderType(type, element) {
  orderData.orderType = type;
  document.querySelectorAll('input[name="orderType"]').forEach((input) => {
    input.closest(".radio-option").classList.remove("selected");
  });
  element.classList.add("selected");

  if (type === "department") {
    document.getElementById("deptSelectSection1").style.display = "block";
    // Change depot selection to department options
    updateDepotOptionsForDepartment();
  } else {
    document.getElementById("deptSelectSection1").style.display = "none";
    // Change depot selection back to depot options
    updateDepotOptionsForIndividual();
  }

  validateSection1();
}

// Function to update depot options for department order type
function updateDepotOptionsForDepartment() {
  const depotSelect = document.getElementById("depot");
  depotSelect.innerHTML = '<option value="">Select department...</option>';

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

  approvedDepartments.forEach((dept) => {
    const option = document.createElement("option");
    option.value = dept;
    option.textContent = dept;
    depotSelect.appendChild(option);
  });

  // Update the label
  const label = depotSelect.previousElementSibling;
  if (label && label.tagName === "LABEL") {
    label.textContent = "Select department";
  }
}

// Function to update depot options for individual order type
function updateDepotOptionsForIndividual() {
  const depotSelect = document.getElementById("depot");
  depotSelect.innerHTML = '<option value="">Select depot...</option>';

  // Original depot options
  const depots = [
    {
      value: "174 NORTH STREET|ALBURY|NSW|2640",
      text: "Albury (174 North Street)",
    },
    {
      value: "32-56 GALLOWAY STREET|ARMIDALE|NSW|2350",
      text: "Armidale (32-56 GallowAY Street)",
    },
    {
      value: "41 CANAL ROAD|BALLINA|NSW|2478",
      text: "Ballina (41 Canal Road)",
    },
    {
      value: "130 KERRISONS LANE|BEGA|NSW|2550",
      text: "Bega (130 Kerrisons Lane)",
    },
    {
      value: "4 LAWSON STREET|BLAYNEY|NSW|2799",
      text: "Blayney (4 Lawson Street)",
    },
    {
      value: "55 FORBES STREET|BOMBALA|NSW|2580",
      text: "Bombala (55 Forbes Street)",
    },
    {
      value: "37 GILLAMATONG LANE|BRAIDWOOD|NSW|2622",
      text: "Braidwood (37 Gillamatong Lane)",
    },
    {
      value: "610 WOLFRAM STREET|BROKEN HILL|NSW|2390",
      text: "Broken Hill (610 Wolfram Street)",
    },
    {
      value: "41 CORBETT AVENUE|BURONGA|NSW|2739",
      text: "Buronga (41 Corbett Avenue)",
    },
    {
      value: "1-7 POLO FLATE ROAD|COOMA|NSW|2630",
      text: "Cooma (1-7 Polo Flate Road)",
    },
    {
      value: "30 MCINTOSH ROAD|CROOKWELL|NSW|2583",
      text: "Crookwell (30 McIntosh Road)",
    },
    {
      value: "401-417 CALIMO STREET|DENILIQUIN|NSW|2705",
      text: "Deniliquin (401-417 Calimo Street)",
    },
    {
      value: "17 HAWTHORN STREET|DUBBO|NSW|2830",
      text: "Dubbo (17 Hawthorn Street)",
    },
    {
      value: "23 HAWTHORN STREET|DUBBO|NSW|2830",
      text: "Dubbo (23 Hawthorn Street)",
    },
    {
      value: "59-87 HAMMOND AVE|EAST WAGGA WAGGA|NSW|2650",
      text: "East Wagga Wagga (59-87 Hammond Ave)",
    },
    {
      value: "10 RICHMOND AVENUE|FAIRBAIRN|ATC|2609",
      text: "Fairbairn (10 Richmond Avenue)",
    },
    {
      value: "25-27 MEMORIAL ROAD|GOULBURN|NSW|2580",
      text: "Goulburn (25-27 Memorial Road)",
    },
    {
      value: "112 QUEEN STREET|GRAFTON|NSW|2460",
      text: "Grafton (112 Queen Street)",
    },
    {
      value: "187 LAWRENCE ROAD|GRAFTON|NSW|2460",
      text: "Grafton (187 Lawrence Road)",
    },
    {
      value: "91 SALEYARDS ROAD|HARDEN|NSW|2587",
      text: "Harden (91 Saleyards Road)",
    },
    {
      value: "25 BURTENSHAW ROAD|INVERELL|NSW|2360",
      text: "Inverell (25 Burtenshaw Road)",
    },
    {
      value: "21 HAMPDEN PARK ROAD|KELSO|NSW|2795",
      text: "Kelso (21 Hampden Park Road)",
    },
    {
      value: "82 WEST STREET|KEMPSEY|NSW|2440",
      text: "Kempsey (82 West Street)",
    },
    {
      value: "11 CRAIG STREET|KYOGLE|NSW|2474",
      text: "Kyogle (11 Craig Street)",
    },
    { value: "7 BRADY WAY|LEETON|NSW|2705", text: "Leeton (7 Brady Way)" },
    {
      value: "26 PAPERBARK DRIVE|MACLEAN|NSW|2463",
      text: "Maclean (26 Paperbark Drive)",
    },
    {
      value: "43 WATSON STREET|MOLONG|NSW|2866",
      text: "Molong (43 Watson Street)",
    },
    {
      value: "210 ARALUEN ROAD|MORUYA|NSW|2537",
      text: "Moruya (210 Araluen Road)",
    },
    {
      value: "22 BURRUNDULLA ROAD|MUDGEE|NSW|2850",
      text: "Mudgee (22 Burrundulla Road)",
    },
    {
      value: "1 LOGAN STREET|NARRABRI|NSW|2390",
      text: "Narrabri (1 Logan Street)",
    },
    {
      value: "48 NYMAGEE STREET|NARROMINE|NSW|2821",
      text: "Narromine (48 Nymagee Street)",
    },
    {
      value: "10 FORGE DRIVE|NORTH BOAMBEE VALLEY COFFS HARBOUR|NSW|2450",
      text: "North Boambee Valley Coffs Harbour (10 Forge Drive)",
    },
    {
      value: "6 DERRIBONG STREET|NYNGAN|NSW|2825",
      text: "Nyngan (6 Derribong Street)",
    },
    { value: "2 LORDS PLACE|ORANGE|NSW|2800", text: "Orange (2 Lords Place)" },
    {
      value: "61-77 BROLGAN ROAD|PARKES|NSW|2870",
      text: "Parkes (61-77 Brolgan Road)",
    },
    {
      value: "8 BULLER STREET|PORT MACQUARIE|NSW|2444",
      text: "Port Macquarie (8 Buller Street)",
    },
    {
      value: "115 HINDMAN STREET|PORT MACQUARIE|NSW|2444",
      text: "Port Macquarie (115 Hindman Street)",
    },
    {
      value: "2 DUKE STREET|QUIRINDI|NSW|2343",
      text: "Quirindi (2 Duke Street)",
    },
    {
      value: "244 UNION STREET|SOUTH LISMORE|NSW|2480",
      text: "South Lismore (244 Union Street)",
    },
    {
      value: "16/227 ELIZABETH STREET|SYDNEY|NSW|2000",
      text: "Sydney (16/227 Elizabeth Street)",
    },
    {
      value: "2A ELECTRA STREET|TAMWORTH|NSW|2340",
      text: "Tamworth (2A Electra Street)",
    },
    {
      value: "38 WHITBREAD STREET|TAREE|NSW|2430",
      text: "Taree (38 Whitbread Street)",
    },
    {
      value: "26 CADELL STREET|TEXAS|QLD|4385",
      text: "Texas (26 Cadell Street)",
    },
    {
      value: "41-53 MERIVALE STREE|TUMUT|NSW|2720",
      text: "Tumut (41-53 Merivale Street)",
    },
    {
      value: "39 SUNSHINE AVENUE|TWEEDS HEAD SOUTH|NSW|2486",
      text: "Tweed's Head South (39 Sunshine Avenue)",
    },
    {
      value: "345 BOOROWA STREET|YOUNG|NSW|2594",
      text: "Young (345 Boorowa Street)",
    },
    {
      value: "other",
      text: "Other (please note - you will need prior approval if your depot is not listed)",
    },
  ];

  depots.forEach((depot) => {
    const option = document.createElement("option");
    option.value = depot.value;
    option.textContent = depot.text;
    depotSelect.appendChild(option);
  });

  // Update the label
  const label = depotSelect.previousElementSibling;
  if (label && label.tagName === "LABEL") {
    label.textContent = "Choose your depot";
  }
}

function selectDepot() {
  const selectedValue = document.getElementById("depot").value;

  // Store differently based on order type
  if (orderData.orderType === "department") {
    orderData.department = selectedValue; // For department orders, store as department
  } else {
    orderData.depot = selectedValue; // For individual orders, store as depot
  }

  validateSection1();
}

function validateSection1() {
  let selectionMade = false;

  if (orderData.orderType === "department") {
    // For department orders, check if a department is selected from the dropdown
    selectionMade = orderData.department && orderData.department !== "";
  } else {
    // For individual orders, check if a depot is selected
    selectionMade = orderData.depot && orderData.depot !== "";
  }

  const deptRequired = orderData.orderType === "department";
  const deptSelected = deptRequired
    ? document.getElementById("costCentre") &&
      document.getElementById("costCentre").value.trim() !== ""
    : true;

  document.getElementById("next1").disabled = !(
    orderData.orderType &&
    selectionMade &&
    deptSelected
  );

  if (deptRequired) {
    // For department orders, the department is selected from the dropdown
    // The cost centre is stored separately
    orderData.costCentre = document.getElementById("costCentre").value.trim();
  }
}

// Listen to department change in section 1
document.addEventListener("DOMContentLoaded", function () {
  const costCentre = document.getElementById("costCentre");
  if (costCentre) {
    costCentre.addEventListener("input", validateSection1);
  }
  // Wire up size guide link
  const sg = document.getElementById("viewSizeGuides");
  if (sg) {
    sg.addEventListener("click", function (e) {
      e.preventDefault();
      openSizeGuides();
    });
  }
});

// Section 2: Garment Selection
function selectGarment(garment, element) {
  orderData.garment = garment;

  // Define garment prices and sizes - using the simplified structure
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
  };

  // Store the selected garment info
  const selectedGarmentInfo = garmentInfo[garment];
  orderData.garmentName = selectedGarmentInfo.name;
  // Get the sizes from the global garmentInfo to populate the size options
  const fullGarmentInfo = {
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
  };
  orderData.garmentSizes = fullGarmentInfo[garment]?.sizes || [];

  // Calculate price based on quantity (default to lowest tier initially)
  // Only set price if the garment has prices defined
  if (selectedGarmentInfo.prices) {
    orderData.garmentPrice = selectedGarmentInfo.prices["1-24"];
  } else {
    orderData.garmentPrice = 0; // Default to 0 if no prices defined
  }

  document.querySelectorAll('input[name="garment"]').forEach((input) => {
    input.closest(".radio-option").classList.remove("selected");
  });
  element.classList.add("selected");

  // Update the personalization section to show/hide size field and available sizes for this garment
  updateSizeOptionsForGarment(fullGarmentInfo[garment]?.sizes || []);

  // Populate price tier options for the selected garment (only if prices exist)
  populatePriceTierOptions(selectedGarmentInfo);

  // Update single-price display if applicable
  updatePriceDisplay();

  document.getElementById("next2").disabled = false;
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
          option.value = `${sizeRange}-${tier}`;
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
  if (currentSection === 5) {
    generateOrderSummary();
  }
}

// Function to update size options in personalization section based on selected garment
function updateSizeOptionsForGarment(sizes) {
  // Check if size field should be displayed for this garment
  const showSizeField =
    orderData.garment === "mens-olympus-softshell-jacket-s-8xl" ||
    orderData.garment === "ladies-olympus-softshell-jacket-8-26" ||
    orderData.garment === "premium-unisex-tech-jacket-2xl-5xl";

  // Update existing personalization items
  document.querySelectorAll(".personalization-item").forEach((item) => {
    const sizeSelect = item.querySelector('[data-field="size"]');

    if (sizeSelect) {
      if (showSizeField) {
        // Show the size field if it's hidden
        const sizeFieldContainer = sizeSelect.closest(".form-group");
        if (sizeFieldContainer) {
          sizeFieldContainer.style.display = "block";
          sizeFieldContainer.style.visibility = "visible";
        }

        // Clear existing options except the first one
        sizeSelect.innerHTML = '<option value="">Select size...</option>';

        // Add new size options based on selected garment
        sizes.forEach((size) => {
          const option = document.createElement("option");
          option.value = size;
          option.textContent = size;
          sizeSelect.appendChild(option);
        });
      } else {
        // Hide the size field for garments that don't need it
        const sizeFieldContainer = sizeSelect.closest(".form-group");
        if (sizeFieldContainer) {
          sizeFieldContainer.style.display = "none";
          sizeFieldContainer.style.visibility = "hidden";
        }
      }
    }
  });
}

// Section 3: Decoration
function selectDecoration(decoration, element) {
  orderData.decoration = decoration;

  const prices = {
    "name-only": 8.0,
    "logo-name": 12.0,
    "logo-only": 9.5,
    "dept-only": 8.5,
    "dept-name": 9.5,
  };

  orderData.decorationPrice = prices[decoration];

  document.querySelectorAll('input[name="decoration"]').forEach((input) => {
    input.closest(".radio-option").classList.remove("selected");
  });
  element.classList.add("selected");

  document.getElementById("next3").disabled = false;
}

// Toggle digitising setup fee
function toggleDigitising(checked) {
  orderData.digitisingFee = checked ? 60.0 : 0;
  // If on review, regenerate summary
  if (currentSection === 5) generateOrderSummary();
  updateFinalTotal();
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

  const needsDept = orderData.decoration.includes("dept");
  const needsName =
    orderData.decoration.includes("name") &&
    !orderData.decoration.includes("dept-only") &&
    !orderData.decoration.includes("logo-only");
  // Build department options from approvedDepartments if needed
  let deptHTML = "";
  if (needsDept) {
    deptHTML += `<div class="form-group">
        <label class="form-label required">Cost Centre <span style="font-weight:400;">(if you are unsure please ask your supervisor)</span></label>
        <input type="text" class="text-input" placeholder="Enter cost centre" data-field="department" data-person="${personalizationCount}">
      </div>`;
  }

  const nameHTML = needsName
    ? `<div class="form-group">
        <label class="form-label required">Individual Person's Name</label>
        <input type="text" class="text-input" placeholder="Enter name" data-field="name" data-person="${personalizationCount}">
      </div>`
    : "";

  // Determine if size field should be shown based on selected garment
  let sizeFieldHTML = "";
  if (
    orderData.garment === "mens-olympus-softshell-jacket-s-8xl" ||
    orderData.garment === "ladies-olympus-softshell-jacket-8-26" ||
    orderData.garment === "premium-unisex-tech-jacket-2xl-5xl"
  ) {
    // Build size options based on selected garment
    let sizeOptionsHTML = '<option value="">Select size...</option>';
    // if (orderData.garmentSizes && Array.isArray(orderData.garmentSizes)) {
    //   orderData.garmentSizes.forEach((size) => {
    //     sizeOptionsHTML += `<option value="${size}">${size}</option>`;
    //   });
    // } else {
    // Default size options if no garment is selected yet
    const defaultSizes = ["8-22", "S-5XL", "24-26", "6X-8XL"];

    defaultSizes.forEach((size) => {
      sizeOptionsHTML += `<option value="${size}">${size}</option>`;
    });
    // }

    sizeFieldHTML = `
      <div class="form-group">
        <label class="form-label required">Size</label>
        <select class="select-input" data-field="size" data-person="${personalizationCount}" onchange="updateGarmentPriceBasedOnQuantity()">
          ${sizeOptionsHTML}
        </select>
      </div>
    `;
  }

  const itemHTML = `
    <div class="personalization-item" id="person-${personalizationCount}">
      <div class="personalization-header">
        <span class="item-number">Person #${personalizationCount}</span>
        ${personalizationCount > 1 ? `<button class="remove-btn" onclick="removePersonalizationItem(${personalizationCount})">Remove</button>` : ""}
      </div>
      ${deptHTML}
      ${nameHTML}
      <div class="grid-2">
        ${sizeFieldHTML}
        <div class="form-group">
          <label class="form-label required">Quantity</label>
          <input type="number" class="number-input" min="1" value="1" data-field="quantity" data-person="${personalizationCount}" oninput="updateGarmentPriceBasedOnQuantity()">
        </div>
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
  orderData.personalizationItems = [];

  document.querySelectorAll(".personalization-item").forEach((item) => {
    const personId = item.id.split("-")[1];

    // Only collect size if the size field should be collected (for certain garments)
    const sizeSelect = item.querySelector('[data-field="size"]');
    let sizeValue = "";

    // Check if this garment requires size selection
    const showSizeField =
      orderData.garment === "mens-olympus-softshell-jacket-s-8xl" ||
      orderData.garment === "ladies-olympus-softshell-jacket-8-26" ||
      orderData.garment === "premium-unisex-tech-jacket-2xl-5xl";

    if (sizeSelect && showSizeField) {
      sizeValue = sizeSelect.value;
    }

    const personData = {
      id: personId,
      department: item.querySelector('[data-field="department"]')?.value || "",
      name: item.querySelector('[data-field="name"]')?.value || "",
      size: sizeValue,
      quantity: parseInt(item.querySelector('[data-field="quantity"]').value),
    };

    orderData.personalizationItems.push(personData);
  });

  // Update garment price based on total quantity
  updateGarmentPriceBasedOnQuantity();
}

// Function to update garment price based on total quantity ordered
function updateGarmentPriceBasedOnQuantity() {
  // Collect current personalization data to get updated quantities
  collectPersonalizationData();

  // Get the selected price tier from the dropdown
  const selectedPriceTier = document.getElementById("priceTierSelect").value;

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
    document.getElementById("priceTierSelect").value = priceTier;

    // Use the automatic price tier
    updateGarmentPriceWithTier(priceTier);
  } else {
    // Use the manually selected price tier
    updateGarmentPriceWithTier(selectedPriceTier);
  }

  // Update the order summary if we're on that section
  if (currentSection === 5) {
    generateOrderSummary();
  }

  // Ensure the price input (if visible) reflects the latest computed price
  updatePriceDisplay();
}

// Helper function to update garment price with a specific tier
function updateGarmentPriceWithTier(priceTier) {
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
              garmentInfo[orderData.garment].prices[priceTier]; // fallback

            // For mens-olympus-softshell-jacket-s-8xl
            if (orderData.garment === "mens-olympus-softshell-jacket-s-8xl") {
              // We need the sizes array to determine the index, so we'll define it here
              const sizes = [
                "S",
                "M",
                "L",
                "XL",
                "2XL",
                "3XL",
                "4XL",
                "5XL",
                "6XL",
                "7XL",
                "8XL",
              ];
              const sizeIndex = sizes.indexOf(item.size);
              if (sizeIndex >= 0 && sizeIndex <= 7) {
                // S-5XL (S, M, L, XL, 2XL, 3XL, 4XL, 5XL)
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["S-5XL"][
                    priceTier
                  ];
              } else if (sizeIndex >= 8) {
                // 6XL-8XL
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["6XL-8XL"][
                    priceTier
                  ];
              }
            }
            // For ladies-olympus-softshell-jacket-8-26
            else if (
              orderData.garment === "ladies-olympus-softshell-jacket-8-26"
            ) {
              // We need the sizes array to determine the index, so we'll define it here
              const sizes = [
                "8",
                "10",
                "12",
                "14",
                "16",
                "18",
                "20",
                "22",
                "24",
                "26",
              ];
              const sizeIndex = sizes.indexOf(item.size);
              if (sizeIndex >= 0 && sizeIndex <= 7) {
                // 8-22
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["8-22"][
                    priceTier
                  ];
              } else if (sizeIndex >= 8) {
                // 24-26
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["24-26"][
                    priceTier
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
            garmentInfo[orderData.garment].prices[priceTier];
        }
      } else {
        // Standard pricing (not dependent on size ranges)
        orderData.garmentPrice =
          garmentInfo[orderData.garment].prices[priceTier];
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

  const container = document.getElementById("orderSummaryContent");
  // Determine what to display based on order type
  let locationLabel =
    orderData.orderType === "department" ? "Department" : "Depot";
  let locationValue = "";

  if (orderData.orderType === "department") {
    // For department orders, use the selected department from the dropdown
    const depotSelect = document.getElementById("depot");
    const selectedOption = depotSelect.options[depotSelect.selectedIndex];
    locationValue = selectedOption
      ? selectedOption.text
      : orderData.department || "Not selected";
  } else {
    // For individual orders, use the selected depot
    const depotSelect = document.getElementById("depot");
    const selectedOption = depotSelect.options[depotSelect.selectedIndex];
    locationValue = selectedOption ? selectedOption.text : "Not selected";
  }

  let summaryHTML = `
  <div class="summary-item"><span>Order Type:</span><span><strong>${orderData.orderType === "individual" ? "Individual" : "Department"}</strong></span></div>
  <div class="summary-item"><span>${locationLabel}:</span><span><strong>${locationValue}</strong></span></div>
  <div class="summary-item"><span>Garment:</span><span><strong>${getGarmentName(orderData.garment)}</strong></span></div>
  <div class="summary-item"><span>Decoration:</span><span><strong>${getDecorationName(orderData.decoration)}</strong></span></div>
  <div class="summary-item"><span>Number of People:</span><span><strong>${orderData.personalizationItems.length}</strong></span></div>
  `;

  // Calculate totals
  const totalQuantity = orderData.personalizationItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  // Use the total garment price that accounts for size-based pricing
  const garmentTotal =
    orderData.totalGarmentPrice || orderData.garmentPrice * totalQuantity;
  const decorationTotal = orderData.decorationPrice * totalQuantity;
  const digitisingTotal = orderData.digitisingFee || 0;
  const subtotal = garmentTotal + decorationTotal;
  const subtotalWithDigitising = subtotal + digitisingTotal;
  summaryHTML += `
                <div class="summary-item">
                    <span>Total Quantity:</span>
                    <span><strong>${totalQuantity} items</strong></span>
                </div>
                <div class="summary-item">
                    <span>Garment Cost:</span>
                    <span class="price">$${garmentTotal.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Decoration Cost:</span>
                  <span class="price">$${decorationTotal.toFixed(2)}</span>
                </div>
                ${digitisingTotal ? `<div class="summary-item"><span>Digitising setup fee:</span><span class="price">$${digitisingTotal.toFixed(2)}</span></div>` : ""}
                <div class="summary-item">
                  <span>Subtotal:</span>
                  <span class="price">$${subtotalWithDigitising.toFixed(2)}</span>
                </div>
            `;

  // Itemise personalizations with edit links
  if (orderData.personalizationItems.length) {
    summaryHTML += `<div class="summary-title" style="margin-top:12px;">Personalizations</div>`;
    orderData.personalizationItems.forEach((p) => {
      summaryHTML += `
        <div class="cart-item">
          <div class="cart-item-header">
            <div class="cart-item-title">Person #${p.id}</div>
            <div><button type="button" class="btn btn-secondary" onclick="editPersonalization(${p.id})">Edit</button></div>
          </div>
          <div class="cart-item-details">
            ${p.department ? `<div><strong>Department:</strong> ${p.department}</div>` : ""}
            ${p.name ? `<div><strong>Name:</strong> ${p.name}</div>` : ""}
            ${p.size ? `<div><strong>Size:</strong> ${p.size}</div>` : ""}
            <div><strong>Quantity:</strong> ${p.quantity}</div>
          </div>
        </div>
      `;
    });
  }

  // Add disclaimer to the summary
  summaryHTML += `
    <div class="disclaimer" style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;">
      <div style="display: flex; align-items: flex-start;">
        <div style="margin-right: 12px; font-size: 20px;">⚠️</div>
        <div>
          <strong>Disclaimer:</strong> Please confirm that you have checked all personalisation details (spelling, etc.). BlackDog is not responsible for mistakes made on this order form.
        </div>
      </div>
    </div>
  `;

  container.innerHTML = summaryHTML;
  updateFinalTotal();
}

// Allow editing individual personalizations from review
function editPersonalization(id) {
  // go back to personalization section
  prevSection(5);
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
      if (p.size) item.querySelector('[data-field="size"]').value = p.size;
      if (p.quantity)
        item.querySelector('[data-field="quantity"]').value = p.quantity;
    });
  }

  // Update size options based on selected garment
  if (orderData.garmentSizes) {
    updateSizeOptionsForGarment(orderData.garmentSizes);
  } else {
    // If no garment sizes are defined, hide size fields for all items
    document.querySelectorAll(".personalization-item").forEach((item) => {
      const sizeSelect = item.querySelector('[data-field="size"]');
      if (sizeSelect) {
        const sizeFieldContainer = sizeSelect.closest(".form-group");
        if (sizeFieldContainer) {
          sizeFieldContainer.style.display = "none";
        }
      }
    });
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
  return names[decoration];
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
          <button id="tab1" class="size-guide-tab active" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-weight:bold;" onclick="switchSizeGuideTab('chart1', this)">Mens Polo 1065</button>
          <button id="tab2" class="size-guide-tab" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;" onclick="switchSizeGuideTab('chart2', this)">Mens Polo JB210</button>
          <button id="tab3" class="size-guide-tab" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;" onclick="switchSizeGuideTab('chart3', this)">Ladies Polo</button>
          <button id="tab4" class="size-guide-tab" style="flex:1;padding:8px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;" onclick="switchSizeGuideTab('chart4', this)">Tech Jacket</button>
        </div>
        
        <!-- Image container -->
        <div style="flex:1;overflow:auto;position:relative;">
          <img id="sizeGuideImage" src="images/chart1.jpeg" alt="Size Guide" style="width:100%;height:auto;max-height:60vh;object-fit:contain;">
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
function switchSizeGuideTab(imageName, clickedButton) {
  // Update the image source
  const imgElement = document.getElementById("sizeGuideImage");
  imgElement.src = `images/${imageName}.jpeg`;

  // Update active tab styling
  const tabs = document.querySelectorAll(".size-guide-tab");
  tabs.forEach((tab) => {
    tab.classList.remove("active");
  });

  clickedButton.classList.add("active");
}

function selectShipping(type, element) {
  orderData.shipping = type;

  const prices = {
    small: 15.5,
    medium: 18.0,
    large: 20.0,
    xl: 25.0,
    freight: 12.0,
  };

  orderData.shippingPrice = prices[type];

  document.querySelectorAll('input[name="shipping"]').forEach((input) => {
    input.closest(".shipping-option").classList.remove("selected");
  });
  element.classList.add("selected");

  updateFinalTotal();
}

function updateFinalTotal() {
  const totalQuantity = orderData.personalizationItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const garmentTotal = orderData.garmentPrice * totalQuantity;
  const decorationTotal = orderData.decorationPrice * totalQuantity;
  const digitisingTotal = orderData.digitisingFee || 0;
  const finalTotal =
    garmentTotal + decorationTotal + digitisingTotal + orderData.shippingPrice;

  document.getElementById("finalTotal").textContent =
    `$${finalTotal.toFixed(2)}`;
}

function addToCart() {
  const address = document.getElementById("shippingAddress").value;

  if (!address) {
    alert("Please enter a shipping address");
    return;
  }

  if (!orderData.shipping) {
    alert("Please select a shipping option");
    return;
  }

  const confirmed =
    document.getElementById("confirmChecked") &&
    document.getElementById("confirmChecked").checked;
  if (!confirmed) {
    alert(
      "Please confirm that you have checked all personalisation details before adding to cart.",
    );
    return;
  }

  // In real Shopify implementation, this would add to cart via Ajax API
  console.log("Adding to cart:", orderData);

  alert(
    "Order added to cart successfully! You can now add another garment or proceed to checkout.",
  );
  document.getElementById("addAnotherBtn").style.display = "block";
}

function addAnotherGarment() {
  if (
    confirm(
      "Start a new garment order? Your current order has been saved to the cart.",
    )
  ) {
    // Reset form
    window.location.reload();
  }
}
