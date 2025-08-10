let expenseCount = 0;

function addExpense() {
  expenseCount++;
  const expenseList = document.getElementById("expense_list");
  const newRow = document.createElement("div");
  newRow.classList.add("expense-row");
  newRow.innerHTML = `
        <input type="text" name="expense_name_${expenseCount}" placeholder="ખર્ચનું નામ (Expense Name)">
        <input type="number" name="expense_amount_${expenseCount}" placeholder="રકમ (Amount)">
        <button type="button" class="remove-expense-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
  expenseList.appendChild(newRow);
}

document.addEventListener("DOMContentLoaded", function () {
  addExpense(); // Start with one empty expense row
  const toggle = document.getElementById("loose_supply_toggle");
  if (toggle) {
    toggle.addEventListener("change", function (event) {
      const isLoose = event.target.checked;
      const looseSection = document.getElementById("loose_supply_section");
      const bagSection = document.getElementById("bag_supply_section");
      const vakalSection = document.getElementById("vakal_section");
      const loosePriceInput = document.getElementById("loose_price_input");

      looseSection.style.display = isLoose ? "table-row-group" : "none";
      bagSection.style.display = isLoose ? "none" : "table-row-group";
      vakalSection.style.display = isLoose ? "none" : "table-row-group";
      loosePriceInput.required = isLoose;
    });
  }
});

function customRound(num) {
  let decimal = num - Math.floor(num);
  return decimal > 0.5 ? Math.ceil(num) : Math.floor(num);
}

function collectData() {
  const form = document.getElementById("estimateForm");
  const formData = new FormData(form);

  let data = {};
  const isLooseSupply = formData.get("is_loose_supply") !== null;
  const deductKantan = formData.get("deduct_kantan") !== null;
  const deductPlastic = formData.get("deduct_plastic") !== null;
  const deductUtrai = formData.get("deduct_utrai") !== null;

  data.expenses = [];
  for (let i = 1; i <= expenseCount; i++) {
    const name = formData.get(`expense_name_${i}`);
    const amount = Number(formData.get(`expense_amount_${i}`)) || 0;
    if (name && amount > 0) {
      data.expenses.push({ name, amount });
    }
  }

  let net_vajan = 0,
    total = 0,
    finalutrai = 0;

  if (isLooseSupply) {
    data.bill_type = "Loose";
    const weight = Number(formData.get("weighbridge_weight")) || 0;
    const price = Number(formData.get("loose_price")) || 0;
    const katta_kasar = customRound(weight * 0.003);
    net_vajan = customRound(weight - katta_kasar);
    total = customRound((net_vajan / 20) * price);
    Object.assign(data, {
      is_match_valid: true,
      weighbridge_weight: weight,
      kasar: katta_kasar,
      bardan_weight: 0,
      bardan_weight_kantan: 0,
      bardan_weight_plastic: 0,
      total_bardan: 0,
      vakal_1_katta: "-",
      vakal_1_kilo: net_vajan,
      vakal_1_bhav: price,
      vakal_1_amount: total,
    });
  } else {
    data.bill_type = "Bag";
    formData.forEach((value, key) => {
      if (
        !key.startsWith("expense_") &&
        !["is_loose_supply", "deduct_kantan", "deduct_plastic", "deduct_utrai"].includes(key)
      ) {
        data[key] = Number(value) || 0;
      }
    });

    let {
      vakal_1_bhav: b1,
      vakal_2_bhav: b2,
      vakal_3_bhav: b3,
      vakal_4_bhav: b4,
      vakal_5_bhav: b5,
      weighbridge_weight: weight,
      bharela_600,
      khali_600,
      bharela_200,
      khali_200,
    } = data;

    let bharela = bharela_600 + bharela_200,
      khali = khali_600 + khali_200,
      totalBardan = bharela + khali;
    let bardanWeightKantan = 0;
    if (deductKantan) bardanWeightKantan = customRound((bharela_600 + khali_600) * 0.6);
    let bardanWeightPlastic = 0;
    if (deductPlastic) bardanWeightPlastic = customRound((bharela_200 + khali_200) * 0.2);

    let Bardan = bardanWeightKantan + bardanWeightPlastic;
    let katta_kasar = customRound(weight * 0.003);
    net_vajan = customRound(weight - katta_kasar - Bardan);
    let katta =
      data.vakal_1_katta + data.vakal_2_katta + data.vakal_3_katta + data.vakal_4_katta + data.vakal_5_katta + khali;
    let perUnitWeight = bharela ? net_vajan / bharela : 0;
    const kiloValues = {};
    let calculatedKilosSum = 0,
      lastActiveVakalIndex = -1;
    for (let i = 5; i >= 1; i--)
      if (data[`vakal_${i}_katta`] > 0) {
        lastActiveVakalIndex = i;
        break;
      }

    for (let i = 1; i <= 5; i++) {
      if (data[`vakal_${i}_katta`] > 0) {
        if (i === lastActiveVakalIndex) kiloValues[i] = net_vajan - calculatedKilosSum;
        else {
          const calculatedKilo = customRound(perUnitWeight * data[`vakal_${i}_katta`]);
          kiloValues[i] = calculatedKilo;
          calculatedKilosSum += calculatedKilo;
        }
      } else kiloValues[i] = 0;
    }
    const amounts = {};
    for (let i = 1; i <= 5; i++) amounts[i] = customRound((kiloValues[i] / 20) * data[`vakal_${i}_bhav`] || 0);

    total = amounts[1] + amounts[2] + amounts[3] + amounts[4] + amounts[5];
    let totalKilo = kiloValues[1] + kiloValues[2] + kiloValues[3] + kiloValues[4] + kiloValues[5];
    let weightMatch = totalKilo === net_vajan,
      kattaMatch = totalBardan === katta,
      isMatchValid = weightMatch && kattaMatch;

    Object.assign(data, {
      is_match_valid: isMatchValid,
      total_bardan: totalBardan,
      kasar: katta_kasar,
      bardan_weight: Bardan,
      bardan_weight_kantan: bardanWeightKantan,
      bardan_weight_plastic: bardanWeightPlastic,
      vakal_1_kilo: kiloValues[1],
      vakal_2_kilo: kiloValues[2],
      vakal_3_kilo: kiloValues[3],
      vakal_4_kilo: kiloValues[4],
      vakal_5_kilo: kiloValues[5],
      vakal_1_amount: amounts[1],
      vakal_2_amount: amounts[2],
      vakal_3_amount: amounts[3],
      vakal_4_amount: amounts[4],
      vakal_5_amount: amounts[5],
      match_message: isMatchValid ? `✅ મેળ ખાય છે` : `❌ મેળ ખાતો નથી!`,
    });
  }

  if (deductUtrai) {
    let utrai_base = customRound((net_vajan / 100) * 7);
    let diff = (total % 10) - (utrai_base % 10);
    if (diff > 5) finalutrai = utrai_base + diff - 10;
    else if (diff < -5) finalutrai = utrai_base + diff + 10;
    else if (diff === 5 || diff === -5) finalutrai = utrai_base - 5;
    else finalutrai = utrai_base + diff;
  }

  const totalExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const finaltotal = total - finalutrai - totalExpenses;

  const now = new Date();
  data.date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}/${now.getFullYear()}`;
  data.net_weight = net_vajan;
  data.total_amount = total;
  data.utrai = finalutrai;
  data.final_total = finaltotal;

  localStorage.setItem("estimateData", JSON.stringify(data));
  window.location.href = "final.html";
}

function displayData() {
  let storedData = localStorage.getItem("estimateData");
  if (!storedData) return;
  let data = JSON.parse(storedData);

  function setValue(id, value) {
    let element = document.getElementById(id);
    if (element) element.innerHTML = value;
  }

  const fieldMapping = {
    display_date: "date",
    display_weighbridge_weight: "weighbridge_weight",
    display_kasar: "kasar",
    display_net_weight: "net_weight",
    display_vakal_1_katta: "vakal_1_katta",
    display_vakal_1_kilo: "vakal_1_kilo",
    display_vakal_1_bhav: "vakal_1_bhav",
    display_vakal_1_amount: "vakal_1_amount",
    display_vakal_2_katta: "vakal_2_katta",
    display_vakal_2_kilo: "vakal_2_kilo",
    display_vakal_2_bhav: "vakal_2_bhav",
    display_vakal_2_amount: "vakal_2_amount",
    display_vakal_3_katta: "vakal_3_katta",
    display_vakal_3_kilo: "vakal_3_kilo",
    display_vakal_3_bhav: "vakal_3_bhav",
    display_vakal_3_amount: "vakal_3_amount",
    display_vakal_4_katta: "vakal_4_katta",
    display_vakal_4_kilo: "vakal_4_kilo",
    display_vakal_4_bhav: "vakal_4_bhav",
    display_vakal_4_amount: "vakal_4_amount",
    display_vakal_5_katta: "vakal_5_katta",
    display_vakal_5_kilo: "vakal_5_kilo",
    display_vakal_5_bhav: "vakal_5_bhav",
    display_vakal_5_amount: "vakal_5_amount",
    display_total_amount: "total_amount",
    display_utrai: "utrai",
    display_final_total: "final_total",
    display_match_message: "match_message",
  };

  Object.entries(fieldMapping).forEach(([id, key]) => setValue(id, data[key] !== undefined ? data[key] : ""));

  const bardanValueElement = document.getElementById("display_bardan_weight");
  if (bardanValueElement) {
    const kantanWeight = data.bardan_weight_kantan || 0,
      plasticWeight = data.bardan_weight_plastic || 0;
    bardanValueElement.textContent = `${kantanWeight} + ${plasticWeight}`;
  }

  // Display other expenses
  const finalTotalBoxContainer = document.getElementById("final_total_box_container");
  if (finalTotalBoxContainer && data.expenses && data.expenses.length > 0) {
    data.expenses.forEach((exp) => {
      const expenseBox = document.createElement("div");
      expenseBox.classList.add("detail-item");
      expenseBox.innerHTML = `<span class="detail-label">${exp.name}</span><span class="detail-value">${exp.amount}</span>`;
      finalTotalBoxContainer.before(expenseBox);
    });
  }

  if (data.bill_type === "Loose") {
    document.getElementById("bardan_box").style.display = "none";
    // document.getElementById("utrai_box").style.display = "none";  // remove because utrai box importent
    document.querySelectorAll(".optional-vakal").forEach((row) => (row.style.display = "none"));
    document.querySelector(".details-grid").style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
  }

  if (data.bill_type === "Bag") {
    for (let i = 1; i <= 5; i++) {
      const kattaValue = data[`vakal_${i}_katta`] || 0;
      const bhavValue = data[`vakal_${i}_bhav`] || 0;
      const vakalRow = document.getElementById(`vakal_row_${i}`);
      if (vakalRow && kattaValue === 0 && bhavValue === 0) {
        vakalRow.style.display = "none";
      }
    }
  }

  const printButton = document.getElementById("printButton");
  if (printButton) printButton.disabled = !data.is_match_valid;

  const originalContainer = document.getElementById("container-original"),
    copyContainer = document.getElementById("container-copy");
  if (originalContainer && copyContainer) {
    const contentToCopy = originalContainer.cloneNode(true);
    contentToCopy.querySelector(".button-container").remove();
    copyContainer.innerHTML = contentToCopy.innerHTML;
  }
}

if (window.location.pathname.includes("final.html")) {
  window.onload = displayData;
}
