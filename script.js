// Global state
let orderData = {
  orderType: "",
  depot: "",
  department: "",
  garment: "",
  garmentPrice: 0,
  decoration: "",
  decorationPrice: 0,
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
  }

  validateSection1();
}

function selectDepot() {
  orderData.depot = document.getElementById("depot").value;
  validateSection1();
}

function validateSection1() {
  const depotSelected = orderData.depot !== "";
  const deptRequired = orderData.orderType === "department";
  const deptSelected = deptRequired
    ? document.getElementById("costCentre") &&
      document.getElementById("costCentre").value.trim() !== ""
    : true;

  document.getElementById("next1").disabled = !(
    orderData.orderType &&
    depotSelected &&
    deptSelected
  );

  if (deptRequired) {
    orderData.department = document.getElementById("costCentre").value.trim();
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

  // Define garment prices and sizes
  const garmentInfo = {
    "mens-polo-xs-5xl": {
      name: "Mens Polo 1065",
      sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
      prices: { // Price based on quantity tiers
        "1-24": 35.00,
        "25-49": 33.25,
        "50-99": 32.40,
        "100+": 29.75
      }
    },
    "mens-polo-5xl-10xl": {
      name: "Mens Polo JB210",
      sizes: ["5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
      prices: {
        "1-24": 35.00,
        "25-49": 33.25,
        "50-99": 32.40,
        "100+": 29.75
      }
    },
    "womens-polo-xs-2xl": {
      name: "Ladies Polo JH201W",
      sizes: ["XS", "S", "M", "L", "XL", "2XL"],
      prices: {
        "1-24": 35.00,
        "25-49": 33.25,
        "50-99": 32.40,
        "100+": 29.75
      }
    },
    "womens-polo-20-26": {
      name: "Ladies Polo 1165",
      sizes: ["20", "22", "24", "26"],
      prices: {
        "1-24": 35.00,
        "25-49": 33.25,
        "50-99": 32.40,
        "100+": 29.75
      }
    },
    "premium-unisex-tech-jacket-2xl-5xl": {
      name: "Podium Unisex Tech Jacket",
      sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
      prices: {
        "1-24": 93.00,
        "25-49": 88.35,
        "50-99": 86.00,
        "100+": 79.10
      }
    },
    "mens-olympus-softshell-jacket-s-8xl": {
      name: "Mens Olympus Softshell Jacket",
      sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"],
      prices: {
        "1-24": 68.00,
        "25-49": 64.50,
        "50-99": 62.90,
        "100+": 57.80
      }
    },
    "ladies-olympus-softshell-jacket-8-26": {
      name: "Ladies Olympus Softshell Jacket",
      sizes: ["8", "10", "12", "14", "16", "18", "20", "22", "24", "26"],
      prices: {
        "1-24": 73.50,
        "25-49": 69.85,
        "50-99": 68.00,
        "100+": 62.50
      }
    }
  };

  // Store the selected garment info
  const selectedGarmentInfo = garmentInfo[garment];
  orderData.garmentName = selectedGarmentInfo.name;
  orderData.garmentSizes = selectedGarmentInfo.sizes;
  
  // Calculate price based on quantity (default to lowest tier initially)
  orderData.garmentPrice = selectedGarmentInfo.prices["1-24"];

  document.querySelectorAll('input[name="garment"]').forEach((input) => {
    input.closest(".radio-option").classList.remove("selected");
  });
  element.classList.add("selected");

  // Update the personalization section to show/hide size field and available sizes for this garment
  updateSizeOptionsForGarment(selectedGarmentInfo.sizes);

  // Populate price tier options for the selected garment
  populatePriceTierOptions(selectedGarmentInfo);

  document.getElementById("next2").disabled = false;
}

// Function to populate price tier options for the selected garment
function populatePriceTierOptions(garmentInfo) {
  // Show the price selection group
  document.getElementById("priceSelectionGroup").style.display = "block";
  
  const selectElement = document.getElementById("priceTierSelect");
  // Clear existing options except the first one
  selectElement.innerHTML = '<option value="">Select quantity tier...</option>';

  // Check if this garment has size-range specific pricing
  if (garmentInfo.sizeRangePrices) {
    // For garments with size-range pricing, we'll add options for each size range
    for (const [sizeRange, prices] of Object.entries(garmentInfo.sizeRangePrices)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = sizeRange;
      
      for (const [tier, price] of Object.entries(prices)) {
        const option = document.createElement('option');
        option.value = `${sizeRange}-${tier}`;
        option.textContent = `${tier} items: $${price.toFixed(2)} each`;
        optgroup.appendChild(option);
      }
      
      selectElement.appendChild(optgroup);
    }
  } else {
    // Add options for standard pricing tiers
    for (const [tier, price] of Object.entries(garmentInfo.prices)) {
      const option = document.createElement('option');
      option.value = tier;
      option.textContent = `${tier} items: $${price.toFixed(2)} each`;
      selectElement.appendChild(option);
    }
  }
}

// Function to handle price tier selection
function selectPriceTier(tier) {
  if (!tier) return;
  
  // Call the helper function to update the price with the selected tier
  updateGarmentPriceWithTier(tier);
  
  // Update the order summary if we're on that section
  if (currentSection === 5) {
    generateOrderSummary();
  }
}

// Function to update size options in personalization section based on selected garment
function updateSizeOptionsForGarment(sizes) {
  // Check if size field should be displayed for this garment
  const showSizeField = (orderData.garment === 'mens-olympus-softshell-jacket-s-8xl' || 
                         orderData.garment === 'ladies-olympus-softshell-jacket-8-26' ||
                         orderData.garment === 'premium-unisex-tech-jacket-2xl-5xl');
  
  // Update existing personalization items
  document.querySelectorAll('.personalization-item').forEach(item => {
    const sizeSelect = item.querySelector('[data-field="size"]');
    
    if (sizeSelect) {
      if (showSizeField) {
        // Show the size field if it's hidden
        const sizeFieldContainer = sizeSelect.closest('.form-group');
        if (sizeFieldContainer) {
          sizeFieldContainer.style.display = 'block';
          sizeFieldContainer.style.visibility = 'visible';
        }
        
        // Clear existing options except the first one
        sizeSelect.innerHTML = '<option value="">Select size...</option>';
        
        // Add new size options based on selected garment
        sizes.forEach(size => {
          const option = document.createElement('option');
          option.value = size;
          option.textContent = size;
          sizeSelect.appendChild(option);
        });
      } else {
        // Hide the size field for garments that don't need it
        const sizeFieldContainer = sizeSelect.closest('.form-group');
        if (sizeFieldContainer) {
          sizeFieldContainer.style.display = 'none';
          sizeFieldContainer.style.visibility = 'hidden';
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
        <label class="form-label required">Department Name</label>
        <select class="select-input" data-field="department" data-person="${personalizationCount}">
          <option value="">Select department...</option>`;
    approvedDepartments.forEach((d) => {
      deptHTML += `<option value="${d}">${d}</option>`;
    });
    deptHTML += `</select></div>`;
  }

  const nameHTML = needsName
    ? `<div class="form-group">
        <label class="form-label required">Individual Person's Name</label>
        <input type="text" class="text-input" placeholder="Enter name" data-field="name" data-person="${personalizationCount}">
      </div>`
    : "";

  // Determine if size field should be shown based on selected garment
  let sizeFieldHTML = '';
  if (orderData.garment === 'mens-olympus-softshell-jacket-s-8xl' || 
      orderData.garment === 'ladies-olympus-softshell-jacket-8-26' ||
      orderData.garment === 'premium-unisex-tech-jacket-2xl-5xl') {
    
    // Build size options based on selected garment
    let sizeOptionsHTML = '<option value="">Select size...</option>';
    if (orderData.garmentSizes && Array.isArray(orderData.garmentSizes)) {
      orderData.garmentSizes.forEach(size => {
        sizeOptionsHTML += `<option value="${size}">${size}</option>`;
      });
    } else {
      // Default size options if no garment is selected yet
      const defaultSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
      defaultSizes.forEach(size => {
        sizeOptionsHTML += `<option value="${size}">${size}</option>`;
      });
    }

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
    const showSizeField = (orderData.garment === 'mens-olympus-softshell-jacket-s-8xl' || 
                           orderData.garment === 'ladies-olympus-softshell-jacket-8-26' ||
                           orderData.garment === 'premium-unisex-tech-jacket-2xl-5xl');
                           
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
      0
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
}

// Helper function to update garment price with a specific tier
function updateGarmentPriceWithTier(priceTier) {
  // Update the garment price based on the selected garment and quantity tier
  if (orderData.garment) {
    const garmentInfo = {
      "mens-polo-xs-5xl": {
        name: "Mens Polo 1065",
        sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
        prices: { // Price based on quantity tiers
          "1-24": 35.00,
          "25-49": 33.25,
          "50-99": 32.40,
          "100+": 29.75
        }
      },
      "mens-polo-5xl-10xl": {
        name: "Mens Polo JB210",
        sizes: ["5XL", "6XL", "7XL", "8XL", "9XL", "10XL"],
        prices: {
          "1-24": 35.00,
          "25-49": 33.25,
          "50-99": 32.40,
          "100+": 29.75
        }
      },
      "womens-polo-xs-2xl": {
        name: "Ladies Polo JH201W",
        sizes: ["XS", "S", "M", "L", "XL", "2XL"],
        prices: {
          "1-24": 35.00,
          "25-49": 33.25,
          "50-99": 32.40,
          "100+": 29.75
        }
      },
      "womens-polo-20-26": {
        name: "Ladies Polo 1165",
        sizes: ["20", "22", "24", "26"],
        prices: {
          "1-24": 35.00,
          "25-49": 33.25,
          "50-99": 32.40,
          "100+": 29.75
        }
      },
      "premium-unisex-tech-jacket-2xl-5xl": {
        name: "Podium Unisex Tech Jacket",
        sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
        prices: {
          "1-24": 93.00,
          "25-49": 88.35,
          "50-99": 86.00,
          "100+": 79.10
        }
      },
      "mens-olympus-softshell-jacket-s-8xl": {
        name: "Mens Olympus Softshell Jacket",
        sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"],
        prices: {
          "1-24": 68.00,
          "25-49": 64.50,
          "50-99": 62.90,
          "100+": 57.80
        },
        // Additional pricing based on size ranges
        sizeRangePrices: {
          "S-5XL": {
            "1-24": 68.00,
            "25-49": 64.50,
            "50-99": 62.90,
            "100+": 57.80
          },
          "6XL-8XL": {
            "1-24": 73.50,
            "25-49": 69.85,
            "50-99": 68.00,
            "100+": 62.50
          }
        }
      },
      "ladies-olympus-softshell-jacket-8-26": {
        name: "Ladies Olympus Softshell Jacket",
        sizes: ["8", "10", "12", "14", "16", "18", "20", "22", "24", "26"],
        prices: {
          "1-24": 73.50,
          "25-49": 69.85,
          "50-99": 68.00,
          "100+": 62.50
        },
        // Additional pricing based on size ranges
        sizeRangePrices: {
          "8-22": {
            "1-24": 68.00,
            "25-49": 64.50,
            "50-99": 62.90,
            "100+": 57.80
          },
          "24-26": {
            "1-24": 73.50,
            "25-49": 69.85,
            "50-99": 68.00,
            "100+": 62.50
          }
        }
      }
    };

    if (garmentInfo[orderData.garment]) {
      // Check if this garment has size-range specific pricing
      if (garmentInfo[orderData.garment].sizeRangePrices) {
        // Calculate the total price based on individual selections
        let totalPrice = 0;
        let itemCount = 0;

        orderData.personalizationItems.forEach(item => {
          if (item.size) {
            itemCount += item.quantity;

            // Determine which size range this size belongs to
            let applicablePrice = garmentInfo[orderData.garment].prices[priceTier]; // fallback

            // For mens-olympus-softshell-jacket-s-8xl
            if (orderData.garment === 'mens-olympus-softshell-jacket-s-8xl') {
              const sizeIndex = garmentInfo[orderData.garment].sizes.indexOf(item.size);
              if (sizeIndex >= 0 && sizeIndex <= 7) { // S-5XL (S, M, L, XL, 2XL, 3XL, 4XL, 5XL)
                applicablePrice = garmentInfo[orderData.garment].sizeRangePrices["S-5XL"][priceTier];
              } else if (sizeIndex >= 8) { // 6XL-8XL
                applicablePrice = garmentInfo[orderData.garment].sizeRangePrices["6XL-8XL"][priceTier];
              }
            }
            // For ladies-olympus-softshell-jacket-8-26
            else if (orderData.garment === 'ladies-olympus-softshell-jacket-8-26') {
              const sizeIndex = garmentInfo[orderData.garment].sizes.indexOf(item.size);
              if (sizeIndex >= 0 && sizeIndex <= 7) { // 8-22
                applicablePrice = garmentInfo[orderData.garment].sizeRangePrices["8-22"][priceTier];
              } else if (sizeIndex >= 8) { // 24-26
                applicablePrice = garmentInfo[orderData.garment].sizeRangePrices["24-26"][priceTier];
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
          orderData.garmentPrice = garmentInfo[orderData.garment].prices[priceTier];
        }
      } else {
        // Standard pricing (not dependent on size ranges)
        orderData.garmentPrice = garmentInfo[orderData.garment].prices[priceTier];
        orderData.totalGarmentPrice = orderData.garmentPrice * orderData.personalizationItems.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        );
      }
    }
  }
}

// Section 5: Order Summary
function generateOrderSummary() {
  collectPersonalizationData();

  const container = document.getElementById("orderSummaryContent");
  let summaryHTML = `
  <div class="summary-item"><span>Order Type:</span><span><strong>${orderData.orderType === "individual" ? "Individual" : "Department"}</strong></span></div>
  <div class="summary-item"><span>Depot:</span><span><strong>${document.getElementById("depot").selectedOptions[0].text}</strong></span></div>
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
  const garmentTotal = orderData.totalGarmentPrice || (orderData.garmentPrice * totalQuantity);
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
    document.querySelectorAll('.personalization-item').forEach(item => {
      const sizeSelect = item.querySelector('[data-field="size"]');
      if (sizeSelect) {
        const sizeFieldContainer = sizeSelect.closest('.form-group');
        if (sizeFieldContainer) {
          sizeFieldContainer.style.display = 'none';
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
    "premium-unisex-tech-jacket-2xl-5xl": "Podium Unisex Tech Jacket (2XS - 5XL)",
    "mens-olympus-softshell-jacket-s-8xl": "Mens Olympus Softshell Jacket (S - 8XL)",
    "ladies-olympus-softshell-jacket-8-26": "Ladies Olympus Softshell Jacket (8 - 26)",
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
  // simple implementation: open a small modal with links (could be images or PDFs)
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
      <div style="background:#fff;padding:20px;border-radius:8px;max-width:720px;width:90%;">
        <h3>Size Guides</h3>
        <p>Size guides will be linked here. Place your size guide files in the project and update the links.</p>
        <ul>
          <li><a href="#" onclick="alert('Replace with actual size guide link')">Mens Polo 1065 (size guide)</a></li>
          <li><a href="#" onclick="alert('Replace with actual size guide link')">Mens Polo JB210 (size guide)</a></li>
          <li><a href="#" onclick="alert('Replace with actual size guide link')">Ladies Polo JH201W (size guide)</a></li>
          <li><a href="#" onclick="alert('Replace with actual size guide link')">Podium Tech Jacket (size guide)</a></li>
        </ul>
        <div style="text-align:right;margin-top:12px;"><button onclick="document.getElementById('${modalId}').remove()">Close</button></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
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
  const finalTotal = garmentTotal + decorationTotal + orderData.shippingPrice;

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
