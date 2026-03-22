// DOM element refs
const partySizeInput = document.getElementById("party-size");
const lootNameInput = document.getElementById("loot-name");
const lootValueInput = document.getElementById("loot-value");
const lootQuantityInput = document.getElementById("loot-quantity");
const addLootBtn = document.getElementById("add-loot-btn");
const splitLootBtn = document.getElementById("split-loot-btn");
const lootRows = document.getElementById("lootRows");
const lootTable = document.getElementById("loot-table");
const noLootMessage = document.getElementById("noLootMessage");
const totalLootEl = document.getElementById("totalLoot");
const totalRowEl = document.getElementById("total-row");
const finalTotalEl = document.getElementById("final-total");
const perMemberEl = document.getElementById("per-member");
const resultsArea = document.getElementById("results-area");
const partyErrorEl = document.getElementById("party-error");
const partyConfirmEl = document.getElementById("party-confirm");
const lootErrorEl = document.getElementById("loot-error");
const resetBtn = document.getElementById("reset");
const topError = document.getElementById('top-error');
const topSuccess = document.getElementById('top-success');
const topProcessing = document.getElementById('top-processing');

const REQ_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
}

const url = 'http://goldtop.hopto.org'
const studentId = "TamilaM"

initialize();

function initialize() {
  topProcessing.textContent = `State is loading for student ${studentId}...`;
  topProcessing.classList.remove('hidden');

  getState()
    .then(state => {
      topProcessing.classList.add('hidden');

      if (state.status === REQ_STATUS.SUCCESS) {
        topSuccess.textContent = `State loaded successfully for student ${studentId}!`;
        topSuccess.classList.remove('hidden');
        partySizeInput.value = state.partySize > 0 ? state.partySize : "";

        updateUI();
      } else {
        topError.textContent = `No saved state found for student ${studentId}`;
        topError.classList.remove('hidden');
      }

    })

}

function getState() {
  return fetch(`${url}/load/${studentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
  })
    .then(response => response.json())
    .then(data => {
      const state = {
        status: data.status === 'loaded' ? REQ_STATUS.SUCCESS : REQ_STATUS.ERROR,
        lootItems: data.state.loot || [],
        partySize: data.state.partySize || 0
      }
      return state;
    })
    .catch(error => {
      const state = {
        status: REQ_STATUS.ERROR,
        loot: [],
        partySize: 0
      }
      return state;
    });
}

function setState(state) {
  topError.classList.add('hidden');
  topSuccess.classList.add('hidden');
  topProcessing.textContent = `State is saving for student ${studentId}...`;
  topProcessing.classList.remove('hidden');

  return syncToServer(state)
    .then((status) => {
      topProcessing.classList.add('hidden');
      if (status === REQ_STATUS.SUCCESS) {
        topSuccess.textContent = `State saved successfully for student ${studentId}!`;
        topSuccess.classList.remove('hidden');

        updateUI();
      } else {
        topError.textContent = `Failed to save state for student ${studentId}`;
        topError.classList.remove('hidden');
      }

    })
}

function syncToServer(state) {
  const payload = {
    studentId: studentId,
    state: {
      loot: state.lootItems,
      partySize: state.partySize
    }
  };

  return fetch(`http://goldtop.hopto.org/save/${studentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'saved') {
        return REQ_STATUS.SUCCESS;
      } else {
        return REQ_STATUS.ERROR;
      }
    })
    .catch(error => {
      return REQ_STATUS.ERROR;
    });
}

function resetState() {
  return syncToServer({
    lootItems: [],
    partySize: 0
  })
}

// centralized update function
function updateUI() {
  getState().then(state => {
    const {
      newPartySize,
    } = validatePartySize(partySizeInput, state.partySize);

    if(newPartySize !== state.partySize) {
      setState({ ...state, partySize: newPartySize });
    }

    renderLootList(state);

    // calculate total loot
    let totalLoot = 0;
    for (let i = 0; i < state.lootItems.length; i++) {
      totalLoot += state.lootItems[i].value * state.lootItems[i].quantity;
    }
    totalLootEl.textContent = totalLoot.toFixed(2);

    // calculate loot per party member and update results
    if (state.lootItems.length > 0 && state.partySize > 0) {
      const perMember = totalLoot / state.partySize;
      finalTotalEl.textContent = "$" + totalLoot.toFixed(2);
      perMemberEl.textContent = "$" + perMember.toFixed(2);
      resultsArea.className = "results-area";
    } else {
      resultsArea.className = "results-area hidden";
    }
  })
}

function renderLootList(state) {
  lootRows.innerHTML = "";

  // if empty, nothing to render
  if (state.lootItems?.length === 0) {
    noLootMessage.classList.remove("hidden");
    lootTable.classList.add("hidden");
    totalRowEl.classList.add("hidden");
    return;
  }

  noLootMessage.classList.add("hidden");
  lootTable.classList.remove("hidden");
  totalRowEl.classList.remove("hidden");

  // Loop to render each loot item as a grid row
  for (let i = 0; i < state.lootItems.length; i++) {
    const rowItem = createLootRow(state.lootItems[i], i);
    lootRows.appendChild(rowItem);
  }
}

function createLootRow(item, index) {
  const row = document.createElement("div");
  row.className = "loot-row";

  const nameCell = document.createElement("div");
  nameCell.className = "loot-cell";
  nameCell.innerText = item.name;

  const valueCell = document.createElement("div");
  valueCell.className = "loot-cell";
  valueCell.innerText = item.value.toFixed(2);

  const quantityCell = document.createElement("div");
  quantityCell.className = "loot-cell";
  quantityCell.innerText = item.quantity;

  const actionCell = document.createElement("div");
  actionCell.className = "loot-cell loot-actions";

  const removeBtn = document.createElement("button");
  removeBtn.innerText = "Remove";
  removeBtn.addEventListener("click", () => removeLoot(index));

  actionCell.appendChild(removeBtn);

  row.appendChild(nameCell);
  row.appendChild(valueCell);
  row.appendChild(quantityCell);
  row.appendChild(actionCell);

  return row;
}

function validatePartySize(input, statePartySize) {
  partyErrorEl.textContent = "";
  partyConfirmEl.textContent = "";

  let inputPartySize = parseInt(input.value, 10);

  let partySizeToSet = statePartySize;

  if (input.value === "" || isNaN(inputPartySize)) {
    partyErrorEl.textContent = "Party size must be a number.";
  } else if (inputPartySize < 1) {
    partyErrorEl.textContent = "Party size must be at least 1.";
  } else {
    partyConfirmEl.textContent = "Party size set to " + inputPartySize + " member" + (inputPartySize === 1 ? "!" : "s!");
    partySizeToSet = inputPartySize;
  }

  return { newPartySize: partySizeToSet };
}

// Add loot — validates input, mutates state, then calls updateUI
function addLoot() {
  const {
    name, value, quantity,
    isValid
  } = validateNewLoot();

  if (!isValid) {
    return;
  }

  getState().then(state => {
    const lootItems = state.lootItems;
    lootItems.push({ name, value, quantity });
    setState({ ...state, loot: lootItems });

    // state changed
    updateUI();
  });
}

function validateNewLoot() {
  lootErrorEl.textContent = "";

  const name = lootNameInput.value;
  const value = parseFloat(lootValueInput.value);
  const quantity = parseInt(lootQuantityInput.value, 10);

  // validate loot name
  if (name === "") {
    lootErrorEl.textContent = "Please enter a loot name.";
    return { isValid: false };
  }

  // validate loot value
  if (lootValueInput.value === "" || isNaN(value)) {
    lootErrorEl.textContent = "Please enter a valid loot value.";
    return { isValid: false };
  }

  if (value < 0) {
    lootErrorEl.textContent = "Loot value cannot be negative.";
    return { isValid: false };
  }

  // validate quantity
  if (lootQuantityInput.value === "" || isNaN(quantity)) {
    lootErrorEl.textContent = "Please enter a valid quantity.";
    return { isValid: false };
  }

  if (quantity < 1) {
    lootErrorEl.textContent = "Quantity must be at least 1.";
    return { isValid: false };
  }

  // clear form before move forward
  lootNameInput.value = "";
  lootValueInput.value = "";
  lootQuantityInput.value = "";

  return { name, value, quantity, isValid: true };
}

function removeLoot(index) {
  getState().then(state => {
    const lootItems = state.lootItems;
    lootItems.splice(index, 1);
    setState({ ...state, loot: lootItems });
    updateUI();
  });
}

function splitLoot() {
  updateUI();
}

function reset() {
  resetState().then(() => {
    partySizeInput.value = "";
    updateUI();
  });
}

// add loot button
addLootBtn.addEventListener("click", addLoot);

// reset button
resetBtn.addEventListener("click", reset);

// party size input
partySizeInput.addEventListener("input", updateUI);

// Enter key support for inputs for mobile and bettrer use cases
lootNameInput.addEventListener("keydown", function (event) {
  // If enter is pressed move focus to value input
  if (event.key === "Enter") {
    lootValueInput.focus();
  }
});

lootValueInput.addEventListener("keydown", function (event) {
  // if enter is pressed move focus to quantity input
  if (event.key === "Enter") {
    lootQuantityInput.focus();
  }
});

lootQuantityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    lootQuantityInput.blur();
    addLoot();
  }
});

partySizeInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    updateUI();
  }
});
