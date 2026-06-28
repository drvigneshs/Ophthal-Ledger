const normalizeName = (value) => value?.trim().toLowerCase();

const addUniqueEntry = (list, entry) => {
  const trimmedName = entry?.name?.trim();

  if (!trimmedName) {
    return;
  }

  const existingIndex = list.findIndex((item) => normalizeName(item.name) === normalizeName(trimmedName));

  if (existingIndex === -1) {
    list.push({ ...entry, name: trimmedName });
    return;
  }

  list[existingIndex] = { ...list[existingIndex], ...entry, name: trimmedName };
};

export const buildNameSuggestions = (encounters = []) => {
  const suggestions = {
    procedures: [],
    surgeries: [],
    medications: [],
  };

  encounters.forEach((encounter) => {
    encounter.procedures?.forEach((procedure) => {
      if (!procedure?.name) {
        return;
      }

      const entry = {
        name: procedure.name,
        amount: procedure.amount,
      };

      if (procedure.type === 'Surgery') {
        addUniqueEntry(suggestions.surgeries, entry);
      } else {
        addUniqueEntry(suggestions.procedures, entry);
      }
    });

    encounter.medications?.forEach((medication) => {
      addUniqueEntry(suggestions.medications, {
        name: medication.name,
        qty: medication.qty,
        buyPrice: medication.buyPrice,
        sellPrice: medication.sellPrice,
      });
    });
  });

  return suggestions;
};
