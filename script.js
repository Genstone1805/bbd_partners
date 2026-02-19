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
  decorationDepartment: "",
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
  } else {
    document.getElementById("deptSelectSection1").style.display = "none";
    document.getElementById("departmentSelect").value = "";
    orderData.department = "";
  }

  validateSection1();
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

// Listen to department change in section 1
document.addEventListener("DOMContentLoaded", function () {
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

  // Define garment info with sizes based on size guide charts
  const garmentInfo = {
    "mens-polo-xs-5xl": {
      name: "Mens Polo 1065",
      sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "5XL"],
    },
    "mens-polo-5xl-10xl": {
      name: "Mens Polo JB210",
      sizes: ["6/7XL", "8/9XL", "10/11XL"],
    },
    "womens-polo-xs-2xl": {
      name: "Ladies Polo JH201W",
      sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    },
    "womens-polo-20-26": {
      name: "Ladies Polo 1165",
      sizes: ["6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26"],
    },
    "premium-unisex-tech-jacket-2xl-5xl": {
      name: "Podium Unisex Tech Jacket",
      sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
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
      sizes: ["8", "10", "12", "14", "16", "18", "20", "22", "24", "26"],
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

  // Store the selected garment info
  const selectedGarmentInfo = garmentInfo[garment];
  orderData.garmentName = selectedGarmentInfo.name;
  orderData.garmentSizes = selectedGarmentInfo.sizes || [];

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

  // Update the personalization section to show size field and available sizes for this garment
  updateSizeOptionsForGarment(selectedGarmentInfo.sizes || []);

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
  if (decoration !== "logo-name" && decoration !== "name-only" && decoration !== "dept-name") {
    document.getElementById("decorationNameInput").value = "";
    orderData.decorationName = "";
  }

  validateSection3();
}

// Logo selection
function selectLogo(logo) {
  orderData.logo = logo;
  validateSection3();
}

// Name input
function saveDecorationName(name) {
  orderData.decorationName = name;
  validateSection3();
}

// Department selection
function saveDecorationDepartment(dept) {
  orderData.decorationDepartment = dept;
  validateSection3();
}

// Validate section 3
function validateSection3() {
  const decoration = orderData.decoration;
  let isValid = false;

  if (decoration === "logo-only") {
    isValid = orderData.logo && orderData.logo !== "";
  } else if (decoration === "logo-name") {
    isValid = orderData.logo && orderData.logo !== "" && 
              orderData.decorationName && orderData.decorationName.trim() !== "";
  } else if (decoration === "name-only") {
    isValid = orderData.decorationName && orderData.decorationName.trim() !== "";
  } else if (decoration === "dept-only") {
    isValid = orderData.decorationDepartment && orderData.decorationDepartment !== "";
  } else if (decoration === "dept-name") {
    isValid = orderData.decorationDepartment && orderData.decorationDepartment !== "" &&
              orderData.decorationName && orderData.decorationName.trim() !== "";
  }

  document.getElementById("next3").disabled = !isValid;
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

  // Build size options based on selected garment
  let sizeOptionsHTML = '<option value="">Select size...</option>';
  if (orderData.garmentSizes && orderData.garmentSizes.length > 0) {
    orderData.garmentSizes.forEach((size) => {
      sizeOptionsHTML += `<option value="${size}">${size}</option>`;
    });
  }

  // Size field is now shown for all garments
  const sizeFieldHTML = `
    <div class="form-group">
      <label class="form-label required">Size</label>
      <select class="select-input" data-field="size" data-person="${personalizationCount}" onchange="updateGarmentPriceBasedOnQuantity()">
        ${sizeOptionsHTML}
      </select>
    </div>
  `;

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

    // Always collect size data for all garments
    const sizeSelect = item.querySelector('[data-field="size"]');
    const sizeValue = sizeSelect ? sizeSelect.value : "";

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
            // Sizes: S, M, L, XL, XXL, 3XL, 5XL, 6XL, 7XL, 8XL
            // S-5XL includes: S, M, L, XL, XXL, 3XL, 5XL
            // 6XL-8XL includes: 6XL, 7XL, 8XL
            if (orderData.garment === "mens-olympus-softshell-jacket-s-8xl") {
              const sTo5xlSizes = ["S", "M", "L", "XL", "XXL", "3XL", "5XL"];
              const sixXlTo8xlSizes = ["6XL", "7XL", "8XL"];
              
              if (sTo5xlSizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["S-5XL"][
                    priceTier
                  ];
              } else if (sixXlTo8xlSizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["6XL-8XL"][
                    priceTier
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
              const eightTo22Sizes = ["8", "10", "12", "14", "16", "18", "20", "22"];
              const twentyFourTo26Sizes = ["24", "26"];
              
              if (eightTo22Sizes.includes(item.size)) {
                applicablePrice =
                  garmentInfo[orderData.garment].sizeRangePrices["8-22"][
                    priceTier
                  ];
              } else if (twentyFourTo26Sizes.includes(item.size)) {
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
  ${orderData.logo ? `<div class="summary-item"><span>Logo:</span><span><strong>${getLogoName(orderData.logo)}</strong></span></div>` : ""}
  ${orderData.decorationName ? `<div class="summary-item"><span>Name:</span><span><strong>${orderData.decorationName}</strong></span></div>` : ""}
  ${orderData.decorationDepartment ? `<div class="summary-item"><span>Department:</span><span><strong>${orderData.decorationDepartment}</strong></span></div>` : ""}
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
  const subtotal = garmentTotal + decorationTotal;
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
                <div class="summary-item">
                  <span>Subtotal:</span>
                  <span class="price">$${subtotal.toFixed(2)}</span>
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
          <br><br>
          <strong>Cost Centre Approval:</strong> All garment individualisations have been approved by the relevant cost centre. BlackDog Ink takes no responsibility for un-approved customisations ie: nicknames, abbreviated names etc.
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

function getLogoName(logo) {
  const names = {
    "nsw-government": "NSW Government",
    "essential-energy": "Essential Energy",
    "transport": "Transport for NSW",
    "sydney-trains": "Sydney Trains",
    "nsw-trains": "NSW TrainLink",
    "roads-maritime": "Transport for NSW (Roads & Maritime)",
    "service-nsw": "Service NSW",
    "health-nsw": "NSW Health",
    "education-nsw": "NSW Department of Education",
    "other": "Other (please contact your cost centre)",
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
  const finalTotal =
    garmentTotal + decorationTotal + orderData.shippingPrice;

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
