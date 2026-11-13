// Kitchen Hub configuration: edit this file to fit your household.
window.HUB_CONFIG = {
  home: { name: 'Atlantic City', lat: 39.3643, lon: -74.4229, tz: 'America/New_York' },

  // Cities shown in the Weather widget (first one is home)
  weatherCities: [
    { name: 'Atlantic City', lat: 39.3643, lon: -74.4229 },
    { name: 'New Brunswick', lat: 40.4862, lon: -74.4518 },
    { name: 'Philadelphia', lat: 39.9526, lon: -75.1652 }
  ],

  // Family clocks in other time zones
  worldClocks: [
    { name: 'Dhaka', tz: 'Asia/Dhaka', callFrom: 9, callUntil: 22 } // "good time to call" window, local hours
  ],

  // Prayer times: Aladhan API calculation method (2 = ISNA) and Asr school (0 = Standard, 1 = Hanafi)
  prayer: { method: 2, school: 0 },

  // Night mode hours (24h, home time)
  night: { from: 21, until: 5 },

  family: ['Ammu', 'Abbu', 'Nilima', 'Bhaiya', 'Everyone'],

  stores: [
    { id: 'grocery', en: 'Grocery store', bn: 'মুদি দোকান' },
    { id: 'sams', en: 'Sam’s Club', bn: 'Sam’s Club' }
  ],

  // Family dish library: needs = ingredients that usually have to be bought
  dishes: [
    { name: 'Chicken curry & rice', bn: 'মুরগির ঝোল', needs: [] },
    { name: 'Khichuri', bn: 'খিচুড়ি', needs: ['Moong dal', 'Eggs'] },
    { name: 'Fish bhuna', bn: 'মাছ ভুনা', needs: ['Rui fish', 'Onions'] },
    { name: 'Dal & aloo bhaji', bn: 'ডাল ও আলু ভাজি', needs: ['Potatoes'] },
    { name: 'Beef tehari', bn: 'গরুর তেহারি', needs: ['Beef', 'Yogurt'] },
    { name: 'Egg curry', bn: 'ডিমের কারি', needs: ['Eggs'] },
    { name: 'Shutki bhorta', bn: 'শুঁটকি ভর্তা', needs: [] },
    { name: 'Leftovers', bn: 'বাকি খাবার', needs: [] }
  ]
};
