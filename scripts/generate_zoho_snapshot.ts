import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { productImageRegistry } from '../src/server/productImageRegistry.js';
import type { InventoryItem } from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BrandDef {
  brand: string;
  category: string;
  series: {
    model: string;
    puffs?: string;
    nicotine?: string;
    size?: string;
    rate: number;
    msrp: number;
    flavors: string[];
  }[];
}

const BRANDS_CATALOG: BrandDef[] = [
  // 1. Geek Bar (130+ items)
  {
    brand: 'Geekbar',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Pulse 15k',
        puffs: '15,000 Puffs',
        nicotine: '5%',
        rate: 12.50,
        msrp: 24.99,
        flavors: [
          'Blow Pop', 'Fucking Fab', 'Sour Apple Blow Pop', 'Watermelon Ice', 'Miami Mint',
          'Blue Razz Ice', 'Strawberry Banana', 'White Gummy Ice', 'Juicy Peach Ice',
          'Dragon Melon', 'Meta Moon', 'California Cherry', 'Black Cherry', 'Cherry Bomb',
          'Pink Lemonade', 'Fcuking Fab Frozen Edition', 'Frozen Blackberry', 'Frozen Watermelon',
          'Crazy Melon', 'Grape Blow Pop', 'OMG Blow Pop', 'Banana Ice', 'Tropical Rainbow Blast',
          'Sour Apple Ice', 'Scorpio Blue Mint', 'Sagittarius Cherry Bomb', 'Capricorn Dragon Melon'
        ]
      },
      {
        model: 'Pulse X 25k',
        puffs: '25,000 Puffs',
        nicotine: '5%',
        rate: 14.75,
        msrp: 28.99,
        flavors: [
          'Lime Berry Orange', 'Blackberry B-Pop', 'Sour Mango Pineapple', 'Blue Rancher',
          'Orange Fsp', 'Strawberry B-Pop', 'Banana Taffy Freeze', 'Miami Mint', 'Blue Razz Ice',
          'Watermelon Ice', 'Sour Apple Ice', 'Lemon Heads', 'White Peach Raspberry',
          'Grapefruit Refresher', 'Raspberry Peach Lime', 'Cool Mint', 'Midnight Mint',
          'Ruby Sunset', 'Citrus Blast', 'Electric Blue Lemonade', 'Frozen Strawberry',
          'Frozen Peach', 'Frozen Cherry Apple', 'Sour Fcuking Fab', 'Kiwi Passionfruit'
        ]
      },
      {
        model: 'Pulse Ultra 60k',
        puffs: '60,000 Puffs',
        nicotine: '5%',
        rate: 17.50,
        msrp: 34.99,
        flavors: [
          'Miami Mint High Velocity', 'Blue Razz Ice Extreme', 'Watermelon Bubblegum Ice',
          'Strawberry Banana Freeze', 'Sour Apple Ice Blast', 'Triple Berry Crisp',
          'Juicy Mango Ice', 'Dragonfruit Lychee', 'White Gummy Blast', 'California Cherry Turbo',
          'Glacier Mint', 'Peach Mango Watermelon', 'Grape Slushy', 'Rainbow Candy Freeze',
          'Black Ice'
        ]
      },
      {
        model: 'Digiflavor Sky 25K',
        puffs: '25,000 Puffs',
        nicotine: '5%',
        rate: 14.25,
        msrp: 27.99,
        flavors: [
          'Sour Watermelon Blue Razz', 'Strawberry Ice', 'Miami Mint', 'Peach Ice',
          'Triple Berry Ice', 'Cherry Lemon', 'Blueberry Watermelon', 'Pineapple Coconut Ice',
          'Cool Mint', 'Watermelon Ice', 'Blackberry Ice', 'Green Apple Ice', 'Mango Ice',
          'Juicy Peach', 'Grape Ice'
        ]
      },
      {
        model: 'Meloso Max 9000',
        puffs: '9,000 Puffs',
        nicotine: '5%',
        rate: 10.50,
        msrp: 21.99,
        flavors: [
          'Stone Freeze', 'Tropical Fruit', 'Watermelon Ice', 'Strawberry Watermelon',
          'Peach Ice', 'Cool Mint', 'Clear Emerald', 'Sour Apple Ice', 'Fuji Melon Ice',
          'Strawberry Mango', 'Mexico Mango', 'Ginger Ale', 'Blue Razz Ice', 'Green Monster',
          'Apple Peach'
        ]
      },
      {
        model: 'Pulse Starter Kit & Prefilled Replacement Pods',
        puffs: '15,000 Puffs/Pod',
        nicotine: '5%',
        rate: 9.75,
        msrp: 19.99,
        flavors: [
          'Pulse Base Battery Device (Black)', 'Pulse Base Battery Device (Silver)',
          'Pulse Base Battery Device (Blue)', 'Pulse Base Battery Device (Gold)',
          'Replacement Pod 2pk - Miami Mint', 'Replacement Pod 2pk - Blue Razz Ice',
          'Replacement Pod 2pk - Watermelon Ice', 'Replacement Pod 2pk - Sour Apple',
          'Replacement Pod 2pk - Strawberry Banana', 'Replacement Pod 2pk - Fucking Fab',
          'Replacement Pod 2pk - White Gummy Ice', 'Replacement Pod 2pk - Blow Pop',
          'Replacement Pod 2pk - Juicy Peach Ice', 'Replacement Pod 2pk - Dragon Melon',
          'Replacement Pod 2pk - Cool Mint'
        ]
      }
    ]
  },

  // 2. Foger (75 items)
  {
    brand: 'Foger',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Switch Pro 30K',
        puffs: '30,000 Puffs',
        nicotine: '5%',
        rate: 14.50,
        msrp: 29.99,
        flavors: [
          'Sour Apple Ice', 'Blue Razz Ice', 'Strawberry Kiwi', 'Watermelon Bubblegum',
          'Miami Mint', 'Cool Mint', 'Peach Ice', 'Pineapple Coconut', 'Gummy Bear',
          'Strawberry Banana', 'Cherry Lemon', 'Grape Ice', 'Coffee', 'Tobacco',
          'Clear', 'Mexican Mango', 'Blueberry Watermelon', 'Raspberry Lemonade',
          'White Gummy', 'Melon Ice', 'Dragon Fruit', 'Kiwi Passion Fruit', 'Pink Burst',
          'Tropical Punch', 'Juicy Peach'
        ]
      },
      {
        model: 'Switch Pro Replacement Pods',
        puffs: '30,000 Puffs',
        nicotine: '5%',
        rate: 9.25,
        msrp: 18.99,
        flavors: [
          'Switch Pro Pod - Sour Apple Ice', 'Switch Pro Pod - Blue Razz Ice',
          'Switch Pro Pod - Miami Mint', 'Switch Pro Pod - Watermelon Bubblegum',
          'Switch Pro Pod - Cool Mint', 'Switch Pro Pod - Strawberry Kiwi',
          'Switch Pro Pod - Peach Ice', 'Switch Pro Pod - Pineapple Coconut',
          'Switch Pro Pod - Gummy Bear', 'Switch Pro Pod - Grape Ice',
          'Switch Pro Pod - Strawberry Banana', 'Switch Pro Pod - Mexican Mango',
          'Switch Pro Pod - Clear', 'Switch Pro Pod - Raspberry Lemonade',
          'Switch Pro Pod - White Gummy', 'Switch Pro Pod - Melon Ice',
          'Switch Pro Pod - Dragon Fruit', 'Switch Pro Pod - Tropical Punch',
          'Switch Pro Pod - Juicy Peach', 'Switch Pro Pod - Cherry Lemon'
        ]
      },
      {
        model: 'CT10000 Clear Tank',
        puffs: '10,000 Puffs',
        nicotine: '5%',
        rate: 11.25,
        msrp: 22.99,
        flavors: [
          'Cool Mint', 'Blue Razz Ice', 'Watermelon Ice', 'Strawberry Kiwi', 'Sour Apple',
          'Peach Mango Watermelon', 'Kiwi Passionfruit Guava', 'Strawberry Watermelon',
          'Miami Mint', 'Clear'
        ]
      },
      {
        model: 'Ultra 6000',
        puffs: '6,000 Puffs',
        nicotine: '5%',
        rate: 8.75,
        msrp: 16.99,
        flavors: [
          'Mint Ice', 'Blue Razz', 'Watermelon Ice', 'Gummy Bear', 'Snow Cone Ice',
          'Strawberry Ice Cream', 'Pineapple Ice', 'Peach Mango', 'Kiwi Berry', 'Blood Orange'
        ]
      }
    ]
  },

  // 3. RAZ (85 items)
  {
    brand: 'Raz',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'DC25000',
        puffs: '25,000 Puffs',
        nicotine: '5%',
        rate: 14.50,
        msrp: 28.99,
        flavors: [
          'Night Crawler', 'Tiffany', 'Graham Twist', 'Miami Mint', 'Georgia Peach',
          'Wintergreen', 'Blue Raz Cotton Clouds', 'Sour Apple Watermelon', 'Strawberry Orange Tang',
          'Blueberry Watermelon', 'Cherry Strapple', 'Watermelon Ice', 'Bangin Sour Berries',
          'Raspberry Limeade', 'Clear', 'Key Lime Pie', 'Orange Daydream', 'Iced Blue Dragon',
          'Strawberry Burst', 'Black Cherry Peach', 'Watermelon Bubblegum', 'Ruby',
          'Vicky', 'Tobacco', 'Polar Ice'
        ]
      },
      {
        model: 'TN9000 Dream Edition',
        puffs: '9,000 Puffs',
        nicotine: '5%',
        rate: 11.75,
        msrp: 22.99,
        flavors: [
          'Citronnade', 'Cactus Jack', 'Dragon Fruit Lemonade', 'Night Crawler', 'Polar Ice',
          'Graham Twist', 'Ruby', 'Tiffany', 'Vicky', 'Blue Razz Ice', 'Strawberry Shortcake',
          'Cherry Lemon', 'Watermelon Ice', 'Miami Mint', 'Peach Grapefruit', 'Clear',
          'Apple Cinnamon', 'Pumpkin Pie Frosting', 'Banana Coconut', 'Mango Ice',
          'Triple Berry', 'White Gummy Ice', 'Tobacco', 'Blueberry Watermelon', 'Georgia Peach'
        ]
      },
      {
        model: 'LTX 25K Heavy Duty',
        puffs: '25,000 Puffs',
        nicotine: '5%',
        rate: 15.00,
        msrp: 29.99,
        flavors: [
          'Miami Mint', 'Night Crawler Extreme', 'Tiffany Cold', 'Polar Ice Freeze',
          'Georgia Peach Ice', 'Sour Apple Blast', 'Blue Razz Ice', 'Watermelon Candy',
          'Strawberry Banana', 'Cherry Bomb', 'Clear Arctic', 'Dragon Fruit Punch',
          'Grape Slush', 'Citrus Tang', 'Wintergreen Frost'
        ]
      },
      {
        model: 'Vue 50K Modular Pod Kit & Replacement Pods',
        puffs: '50,000 Puffs',
        nicotine: '5%',
        rate: 10.50,
        msrp: 21.99,
        flavors: [
          'Vue Battery Chasis (Midnight Onyx)', 'Vue Battery Chasis (Cyber Gunmetal)',
          'Vue Pod 2pk - Miami Mint', 'Vue Pod 2pk - Night Crawler', 'Vue Pod 2pk - Blue Razz Ice',
          'Vue Pod 2pk - Watermelon Ice', 'Vue Pod 2pk - Graham Twist', 'Vue Pod 2pk - Tiffany',
          'Vue Pod 2pk - Georgia Peach', 'Vue Pod 2pk - Polar Ice', 'Vue Pod 2pk - Sour Apple',
          'Vue Pod 2pk - Strawberry Ice', 'Vue Pod 2pk - Clear Frost', 'Vue Pod 2pk - Cherry Lemon'
        ]
      }
    ]
  },

  // 4. Lost Mary (75 items)
  {
    brand: 'Lost Mary',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'MT15000 Turbo',
        puffs: '15,000 Puffs',
        nicotine: '5%',
        rate: 12.25,
        msrp: 24.99,
        flavors: [
          'Thermal Edition - Summer Grape', 'Thermal Edition - Cherry Strazz',
          'Thermal Edition - Citrus Sunrise', 'Thermal Edition - Miami Mint',
          'Thermal Edition - Nana Coconut', 'Thermal Edition - Strawmelon Peach',
          'Thermal Edition - Watermelon Ice', 'Thermal Edition - Baja Splash',
          'Blue Razz Ice', 'Dr. Cherry', 'Rocket Popsicle', 'Winter Mint',
          'Strawberry Orange', 'Berry Burst', 'Sour Apple Lemon', 'Clear',
          'Banana Cake', 'Peach Mango Watermelon', 'Juicy Peach', 'Grape Jelly',
          'Citrus Sunrise', 'Strawberry Kiwi', 'Blueberry Watermelon', 'Dragon Strazz', 'Apple Pear'
        ]
      },
      {
        model: 'OS5000 Luster Edition',
        puffs: '5,000 Puffs',
        nicotine: '5%',
        rate: 9.75,
        msrp: 18.99,
        flavors: [
          'Cranberry Soda', 'Blue Cotton Candy', 'Strawberry Sundae', 'Juicy Peach',
          'Watermelon Lemon', 'Strawberry Ice', 'Pineapple Mango', 'Blue Razz Ice',
          'Mary Dream', 'Kiwi Passionfruit Guava', 'Peach Mango Watermelon', 'Spearmint',
          'Strawberry Mango', 'Grape', 'Black Mint', 'Lemon Mint', 'Acai Berry Storm Ice',
          'Berry Crush Ice', 'Raspberry Lemonade', 'Light Snow Peppermint', 'Cherry Banana Duo Ice',
          'Lemon Lime', 'Ocean Bay', 'Forest Mint', 'Citrus Ice'
        ]
      },
      {
        model: 'MO20000 Pro',
        puffs: '20,000 Puffs',
        nicotine: '5%',
        rate: 13.50,
        msrp: 26.99,
        flavors: [
          'Miami Mint', 'Blue Razz Ice', 'Watermelon Ice', 'Peach Mango Watermelon',
          'Sour Apple Ice', 'Strawberry Kiwi', 'Tropical Punch', 'Rainbow Sherbet',
          'Pineapple Ice', 'Lime Grapefruit', 'Dragon Drink', 'Cherry Bomb',
          'Mango Twist', 'Cool Mint', 'Watermelon Sour Peach'
        ]
      },
      {
        model: 'BM6000 Big Puff Prefilled',
        puffs: '6,000 Puffs',
        nicotine: '5%',
        rate: 9.50,
        msrp: 17.99,
        flavors: [
          'Blueberry Sour Raspberry', 'Watermelon Ice', 'Triple Mango', 'Strawberry Ice',
          'Pink Lemonade', 'Cola', 'Grape', 'Menthol', 'Pineapple Ice', 'Apple Peach'
        ]
      }
    ]
  },

  // 5. VOZOL (80 items)
  {
    brand: 'VOZOL',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Mega 50K Kit & Modular Pod System',
        puffs: '50,000 Puffs',
        nicotine: '5%',
        rate: 15.50,
        msrp: 32.99,
        flavors: [
          'Blue Razz Ice', 'Watermelon Ice', 'Love 777', 'Miami Mint', 'Grape Ice',
          'Mixed Berries', 'Strawberry Mango', 'Sour Apple Ice', 'Peach Ice',
          'Cherry Cola', 'Dragon Fruit Banana', 'Lemon Mint', 'Cool Mint',
          'Strawberry Kiwi', 'Pineapple Coconut', 'Watermelon Bubblegum', 'Energy Drink',
          'Clear', 'Tobacco Reserve', 'Rainbow Candy', 'Mango Ice', 'Cranberry Ice',
          'Blueberry Storm', 'Lush Ice', 'Cotton Candy'
        ]
      },
      {
        model: 'Rave 50000 Party Screen',
        puffs: '50,000 Puffs',
        nicotine: '5%',
        rate: 16.00,
        msrp: 34.99,
        flavors: [
          'Miami Mint Cyber', 'Blue Razz Ice Neon', 'Watermelon Frost Rave',
          'Strawberry Watermelon Beat', 'Sour Apple Electro', 'Juicy Peach Vibe',
          'Cherry Lemon Pulse', 'Grape Soda Glow', 'Clear Laser', 'Cool Mint Bass',
          'Triple Berry Remix', 'Dragonfruit Limeade', 'Mango Passion Pop', 'Blackberry Ice',
          'Cotton Cloud', 'Glacier Mint', 'Peach Mango Fizz', 'Citrus Blast',
          'Banana Ice Track', 'Polar Freeze'
        ]
      },
      {
        model: 'Vista 20000 6-Level Wattage',
        puffs: '20,000 Puffs',
        nicotine: '5%',
        rate: 13.00,
        msrp: 25.99,
        flavors: [
          'Vana Nic Mint', 'Blue Razz Ice', 'Watermelon Ice', 'Sour Apple Ice',
          'Strawberry Kiwi', 'Peach Mango Watermelon', 'Raspberry Watermelon',
          'Miami Mint', 'Dragon Fruit Banana Cherry', 'Elderflower Grapefruit',
          'Cherry Cola', 'Fstrawberry Raspberry Cherry', 'Mixed Berries', 'Lemon Lime',
          'Mango Ice', 'Grape Ice', 'Watermelon Bubble Gum', 'Cool Mint', 'Clear', 'Tobacco'
        ]
      },
      {
        model: 'Gear Power 20K Full Screen',
        puffs: '20,000 Puffs',
        nicotine: '5%',
        rate: 12.50,
        msrp: 24.99,
        flavors: [
          'Blue Razz Ice', 'Watermelon Ice', 'Strawberry Kiwi', 'Cool Mint', 'Sour Apple',
          'Peach Ice', 'Mango Pineapple Grapefruit', 'Grape Ice', 'Dragon Fruit Lemonade',
          'Cherry Berry Lime', 'Miami Mint', 'Raspberry Tangerine', 'Double Apple',
          'Tobacco', 'Caramel Macchiato'
        ]
      }
    ]
  },

  // 6. OXBAR (50 items)
  {
    brand: 'OXBAR',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Magic Maze 2.0 30K (Pod Juice Edition)',
        puffs: '30,000 Puffs',
        nicotine: '5%',
        rate: 14.50,
        msrp: 28.99,
        flavors: [
          'Jewel Mint Pod Juice Collab', 'Fruity Pebz', 'Clear Jewel', 'Blue Razz Ice',
          'Strawberry Watermelon', 'Watermelon Apple Chew', 'Wap Drops', 'Rocket Pop',
          'Sour Apple Skitz', 'Strawberry Kiwi', 'Fab Fcuking Fab', 'Big Melons',
          'Gummy Bear', 'Clear Green Apple', 'Grape Slushy', 'White Gummy Ice',
          'Watermelon Skitz', 'Blueberry Strawberry Dragonfruit', 'Jewel Tobacco', 'Taffy Freeze',
          'Sour Blue Razz Chew', 'Rainbow Chew', 'Miami Mint', 'Cotton Candy', 'Glacier Mint'
        ]
      },
      {
        model: 'Magic Maze Pro 10K Adjustable Wattage',
        puffs: '10,000 Puffs',
        nicotine: '5%',
        rate: 11.50,
        msrp: 22.99,
        flavors: [
          'Jewel Mint', 'Watermelon Remix Ice', 'Strawberry Watermelon', 'Blue Razz',
          'Sakura Grape', 'Fruit Paradise', 'Rainbow Blast', 'Cranberry Lemon Ice',
          'Splash Bros Lemonade', 'Razz Pineapple', 'Apple Kiwi Ice', 'Pink Burst Chew',
          'Strawberry Shortcake', 'Clear Emerald', 'Tobacco', 'Mad Blue', 'Cool Mint',
          'Peach Ice', 'Grape Ice', 'Mango Peach Watermelon', 'Triple Berry Ice',
          'Watermelon Bubblegum', 'Cherry Lemonade', 'Fuji Apple Ice', 'Lemon Lime'
        ]
      }
    ]
  },

  // 7. Breeze Smoke & Elf Bar (55 items)
  {
    brand: 'Breeze',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Breeze Prime 6000',
        puffs: '6,000 Puffs',
        nicotine: '5%',
        rate: 9.75,
        msrp: 18.99,
        flavors: [
          'Anejo', 'Blueberry Lemon', 'Cherry Lemon', 'Coconut Banana', 'Honeydew Pineapple',
          'Lemon Cola', 'Mango', 'Mint', 'Peach Berry', 'Strawberry Apple', 'Strawberry Mint',
          'Vanilla Tobacco', 'Watermelon Bubblegum', 'Blueberry Mint', 'Cherry Frost'
        ]
      },
      {
        model: 'Breeze Pro 2000',
        puffs: '2,000 Puffs',
        nicotine: '5%',
        rate: 7.25,
        msrp: 14.99,
        flavors: [
          'Anejo', 'Banana Mint', 'Berry Mint', 'Blueberry Mint', 'Blueberry Watermelon',
          'Cherry Lemon', 'Gum Mint', 'Lemon Mint', 'Lush Ice', 'Mint', 'Orange Mango Watermelon',
          'Peach Mango', 'Pom Berry Mint', 'Strawberry Cream', 'Strawberry Peach Mint'
        ]
      }
    ]
  },
  {
    brand: 'Elf Bar',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'EB Design BC5000 Ultra',
        puffs: '5,000 Puffs',
        nicotine: '5%',
        rate: 8.50,
        msrp: 16.99,
        flavors: [
          'Blue Razz Ice', 'Dragon Fruit Banana Berry', 'Grape Honeydew', 'Kiwi Dragon Fruit Berry',
          'Kiwi Passion Fruit Guava', 'Mint', 'Orange Soda', 'Raspberry Watermelon',
          'Strawberry Mango', 'Strawberry Watermelon Bubble Gum', 'Strawberry Watermelon Peach',
          'Tobacco', 'Tropical Rainbow Blast', 'Watermelon Ice', 'Watermelon Bubblegum',
          'Fuji Ice', 'Blackberry Ice', 'Peach Mango Watermelon', 'Lemon Mint', 'Clear',
          'Miami Mint', 'Cotton Candy', 'Strawberry Ice', 'Sour Apple', 'Triple Berry Ice'
        ]
      }
    ]
  },

  // 8. North, Spaceman & Tyson (65 items)
  {
    brand: 'North',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'North FT12000 Zero Lag',
        puffs: '12,000 Puffs',
        nicotine: '5%',
        rate: 12.00,
        msrp: 23.99,
        flavors: [
          'Blue Razz', 'Cherry Banana', 'Cherry Pucker', 'Clear', 'Cool Mint',
          'Crown Peach', 'Frozen Raspberry', 'Gummy Bear', 'Kiwi Dragon Fruit',
          'Lemon Cola', 'Miami Mint', 'Mocha Frappe', 'Night Crawler', 'Pina Colada',
          'Pineapple Passion', 'Raspberry Watermelon', 'Strawberry Banana', 'Strawberry Vanilla Wafer',
          'Watermelon Ice', 'Vanilla Ice'
        ]
      },
      {
        model: 'North Stellar 20K Dual Screen',
        puffs: '20,000 Puffs',
        nicotine: '5%',
        rate: 13.50,
        msrp: 26.99,
        flavors: [
          'Blue Razz Ice', 'Miami Mint', 'Strawberry Watermelon', 'Juicy Peach Ice',
          'Sour Apple Ice', 'Watermelon Bubblegum', 'Cool Mint', 'Tropical Summer',
          'Cherry Lemon', 'Clear Arctic'
        ]
      }
    ]
  },
  {
    brand: 'Spaceman',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Spaceman Prism 20K (Smoktech Collab)',
        puffs: '20,000 Puffs',
        nicotine: '5%',
        rate: 13.25,
        msrp: 25.99,
        flavors: [
          'Dark Grapefruit', 'Apple Kiwi Ice', 'Blue Razz Ice', 'Blue Razz Watermelon',
          'Cali Lemonade', 'Candy Trio', 'Cherry Bomb', 'Dragonache', 'Fresh Mint',
          'Miami Mint', 'Pineapple Watermelon', 'Prism Mint', 'Rainbow Belt', 'Strawberry Mint',
          'Triple Strawberry', 'Watermelon Ice', 'Triple Grape', 'Sour Apple Ice',
          'Banana Cake', 'Blueberry Watermelon'
        ]
      }
    ]
  },
  {
    brand: 'Tyson 2.0',
    category: 'Disposable Vapes',
    series: [
      {
        model: 'Iron Mike 15K Knockout',
        puffs: '15,000 Puffs',
        nicotine: '5%',
        rate: 12.50,
        msrp: 24.99,
        flavors: [
          'Apple Punch', 'Blue Razz', 'Cool Mint', 'Frozen Banana', 'Frozen Blueberry',
          'Frozen Grape', 'Frozen Mango', 'Frozen Peach', 'Fuji Apple', 'Grape Razz',
          'Lush Lime', 'Melonhead', 'Mintberry', 'Peach Mango', 'Pineapple Mango',
          'Raspberry Watermelon', 'Strawberry Banana', 'Tobacco', 'Watermelon', 'White Gummy Bear'
        ]
      }
    ]
  },

  // 9. Hardware: Vaporesso, SMOK, Voopoo, Geekvape (75 items)
  {
    brand: 'Vaporesso',
    category: 'Vape Mods & Kits',
    series: [
      {
        model: 'XROS 4 Pod System Kit',
        rate: 19.50,
        msrp: 36.99,
        flavors: [
          'Kit - Black', 'Kit - Silver', 'Kit - Blue', 'Kit - Sunset Neon',
          'Kit - Champagne Gold', 'Kit - Pastel Palette', 'Kit - Bloody Mary', 'Kit - Green'
        ]
      },
      {
        model: 'XROS Pro Pod Kit',
        rate: 23.50,
        msrp: 44.99,
        flavors: [
          'Pro Kit - Black', 'Pro Kit - Space Grey', 'Pro Kit - Red', 'Pro Kit - Orange'
        ]
      },
      {
        model: 'XROS Replacement Pod 4-Packs (COREX 2.0)',
        rate: 9.75,
        msrp: 18.99,
        flavors: [
          'XROS Series Mesh Pods 0.4 ohm 4pk', 'XROS Series Mesh Pods 0.6 ohm 4pk',
          'XROS Series Mesh Pods 0.8 ohm 4pk', 'XROS Series Mesh Pods 1.0 ohm 4pk',
          'XROS Series Mesh Pods 1.2 ohm 4pk'
        ]
      },
      {
        model: 'Luxe XR Max 80W Pod Mod',
        rate: 34.00,
        msrp: 64.99,
        flavors: [
          'Kit - Black', 'Kit - Grey', 'Kit - Silver', 'Kit - Blue', 'Kit - Coral Orange'
        ]
      }
    ]
  },
  {
    brand: 'SMOK',
    category: 'Vape Mods & Kits',
    series: [
      {
        model: 'Novo 5 Pod Kit 30W',
        rate: 18.00,
        msrp: 34.99,
        flavors: [
          'Kit - Silver Black Cobra', 'Kit - Silver Red Cobra', 'Kit - 7-Color Cobra',
          'Kit - Green Blue Cobra', 'Kit - White Cobra', 'Kit - Black Carbon Fiber',
          'Kit - Fluid 7-Color', 'Kit - Fluid Black Grey'
        ]
      },
      {
        model: 'Nord 5 80W Pod System Kit',
        rate: 24.50,
        msrp: 46.99,
        flavors: [
          'Kit - Red Grey Dart', 'Kit - Blue Pink Dart', 'Kit - Green Blue Dart',
          'Kit - 7-Color Dart', 'Kit - Fluid Black Grey', 'Kit - Leather Black', 'Kit - Leather Beige'
        ]
      },
      {
        model: 'RPM Replacement Coils 5-Packs',
        rate: 11.50,
        msrp: 22.99,
        flavors: [
          'RPM Mesh 0.4 ohm Coils 5pk', 'RPM Triple 0.6 ohm Coils 5pk',
          'RPM DC 0.8 ohm MTL Coils 5pk', 'RPM SC 1.0 ohm Coils 5pk',
          'RPM Quartz 1.2 ohm Coils 5pk', 'RPM 3 Meshed 0.15 ohm 5pk',
          'RPM 3 Meshed 0.23 ohm 5pk', 'LP1 Meshed 0.8 ohm 5pk',
          'LP1 Meshed 0.9 ohm 5pk', 'LP1 Meshed 1.2 ohm 5pk'
        ]
      }
    ]
  },
  {
    brand: 'Voopoo',
    category: 'Vape Mods & Kits',
    series: [
      {
        model: 'Drag 4 177W Starter Kit',
        rate: 42.00,
        msrp: 79.99,
        flavors: [
          'Kit - Black + Walnut', 'Kit - Gunmetal + Rosewood', 'Kit - Gunmetal + Tropical Orange',
          'Kit - Gunmetal + Ocean Blue', 'Kit - Black + Dark Walnut'
        ]
      },
      {
        model: 'Argus G2 Pod System Kit',
        rate: 19.00,
        msrp: 35.99,
        flavors: [
          'Kit - Peachy Pink', 'Kit - Iris Blue', 'Kit - Space Grey', 'Kit - Glossy Black', 'Kit - Astral Silver'
        ]
      },
      {
        model: 'PnP Replacement Coils 5-Packs',
        rate: 11.75,
        msrp: 22.99,
        flavors: [
          'PnP-VM1 0.3 ohm 5pk', 'PnP-VM5 0.2 ohm 5pk', 'PnP-VM6 0.15 ohm 5pk',
          'PnP-TW15 0.15 ohm 5pk', 'PnP-TW30 0.30 ohm 5pk'
        ]
      }
    ]
  },
  {
    brand: 'Geekvape',
    category: 'Vape Mods & Kits',
    series: [
      {
        model: 'Aegis Legend 3 200W Starter Kit',
        rate: 48.00,
        msrp: 89.99,
        flavors: [
          'Kit - Titanium Grey', 'Kit - Dark Grey', 'Kit - Black', 'Kit - Silver',
          'Kit - Blue', 'Kit - Red', 'Kit - Golden', 'Kit - Rainbow'
        ]
      },
      {
        model: 'Wenax Q Pod System Kit',
        rate: 15.50,
        msrp: 29.99,
        flavors: [
          'Kit - Cobalt Blue', 'Kit - Rose Pink', 'Kit - Sakura Pink', 'Kit - Gradient Violet', 'Kit - Black'
        ]
      },
      {
        model: 'Z Sub-Ohm Replacement Coils 5-Packs',
        rate: 12.00,
        msrp: 23.99,
        flavors: [
          'Z0.15 XM Coil 0.15 ohm 5pk', 'Z0.2 Coil 0.2 ohm 5pk', 'Z0.25 Dual Coil 0.25 ohm 5pk',
          'Z0.4 Coil 0.4 ohm 5pk', 'B-Series 0.4 ohm 5pk'
        ]
      }
    ]
  },

  // 10. Vape Juices: Coastal Clouds, Naked 100, Juice Head, Twist, Sadboy (95 items)
  {
    brand: 'Coastal Clouds',
    category: 'Vape Juice',
    series: [
      {
        model: 'Coastal Clouds 60ml Freebase E-Liquid',
        size: '60ml',
        nicotine: '3mg / 6mg',
        rate: 7.50,
        msrp: 18.99,
        flavors: [
          'Blood Orange Mango Snow Cone 3mg', 'Blood Orange Mango Snow Cone 6mg',
          'Apple Peach Strawberry 3mg', 'Apple Peach Strawberry 6mg',
          'Blueberry Limeade 3mg', 'Blueberry Limeade 6mg',
          'Tres Leches 3mg', 'Tres Leches 6mg',
          'Menthol 3mg', 'Menthol 6mg',
          'Citrus Peach 3mg', 'Citrus Peach 6mg',
          'Watermelon Cream 3mg', 'Watermelon Cream 6mg',
          'Strawberry Kiwi 3mg', 'Strawberry Kiwi 6mg',
          'Lemon Meringue Pie 3mg', 'Lemon Meringue Pie 6mg',
          'Pineapple Guava 3mg', 'Pineapple Guava 6mg',
          'Mango Berries 3mg', 'Mango Berries 6mg',
          'Caramel Brulee 3mg', 'Caramel Brulee 6mg'
        ]
      },
      {
        model: 'Coastal Clouds Salt Nic 30ml',
        size: '30ml',
        nicotine: '35mg / 50mg',
        rate: 7.25,
        msrp: 17.99,
        flavors: [
          'Salt - Blood Orange Mango 35mg', 'Salt - Blood Orange Mango 50mg',
          'Salt - Apple Peach Strawberry 35mg', 'Salt - Apple Peach Strawberry 50mg',
          'Salt - Blueberry Limeade 35mg', 'Salt - Blueberry Limeade 50mg',
          'Salt - Menthol 35mg', 'Salt - Menthol 50mg',
          'Salt - Watermelon Cream 35mg', 'Salt - Watermelon Cream 50mg',
          'Salt - Mango Berries 35mg', 'Salt - Mango Berries 50mg',
          'Salt - Tobacco 35mg', 'Salt - Tobacco 50mg'
        ]
      }
    ]
  },
  {
    brand: 'Naked 100',
    category: 'Vape Juice',
    series: [
      {
        model: 'Naked 100 60ml Freebase',
        size: '60ml',
        nicotine: '3mg / 6mg',
        rate: 7.25,
        msrp: 17.99,
        flavors: [
          'Hawaiian POG 3mg', 'Hawaiian POG 6mg',
          'Lava Flow 3mg', 'Lava Flow 6mg',
          'Really Berry 3mg', 'Really Berry 6mg',
          'Maui Sun 3mg', 'Maui Sun 6mg',
          'Crisp Menthol 3mg', 'Crisp Menthol 6mg',
          'Straw Lime 3mg', 'Straw Lime 6mg',
          'American Patriots 3mg', 'American Patriots 6mg'
        ]
      },
      {
        model: 'Naked 100 Max Salt 30ml',
        size: '30ml',
        nicotine: '35mg / 50mg',
        rate: 7.00,
        msrp: 16.99,
        flavors: [
          'Max Salt - Hawaiian POG 35mg', 'Max Salt - Hawaiian POG 50mg',
          'Max Salt - Lava Flow 35mg', 'Max Salt - Lava Flow 50mg',
          'Max Salt - Really Berry 35mg', 'Max Salt - Really Berry 50mg',
          'Max Salt - Crisp Menthol 35mg', 'Max Salt - Crisp Menthol 50mg',
          'Max Salt - American Patriots 35mg', 'Max Salt - American Patriots 50mg'
        ]
      }
    ]
  },
  {
    brand: 'Juice Head',
    category: 'Vape Juice',
    series: [
      {
        model: 'Juice Head 100ml Freebase',
        size: '100ml',
        nicotine: '3mg / 6mg',
        rate: 8.50,
        msrp: 21.99,
        flavors: [
          'Peach Pear 3mg', 'Peach Pear 6mg',
          'Blueberry Lemon 3mg', 'Blueberry Lemon 6mg',
          'Watermelon Lime 3mg', 'Watermelon Lime 6mg',
          'Strawberry Kiwi 3mg', 'Strawberry Kiwi 6mg',
          'Guava Peach 3mg', 'Guava Peach 6mg',
          'Freeze Peach Pear 3mg', 'Freeze Peach Pear 6mg',
          'Freeze Watermelon Lime 3mg', 'Freeze Watermelon Lime 6mg',
          'Freeze Blueberry Lemon 3mg', 'Freeze Blueberry Lemon 6mg'
        ]
      },
      {
        model: 'Juice Head Salts 30ml',
        size: '30ml',
        nicotine: '35mg / 50mg',
        rate: 7.25,
        msrp: 17.99,
        flavors: [
          'Salts - Peach Pear 35mg', 'Salts - Peach Pear 50mg',
          'Salts - Blueberry Lemon 35mg', 'Salts - Blueberry Lemon 50mg',
          'Salts - Watermelon Lime 35mg', 'Salts - Watermelon Lime 50mg',
          'Salts - Strawberry Kiwi 35mg', 'Salts - Strawberry Kiwi 50mg',
          'Salts - Guava Peach 35mg', 'Salts - Guava Peach 50mg'
        ]
      }
    ]
  },
  {
    brand: 'Twist E-Liquids',
    category: 'Vape Juice',
    series: [
      {
        model: 'Twist 120ml Twin Pack (2 x 60ml)',
        size: '120ml',
        nicotine: '3mg / 6mg',
        rate: 9.50,
        msrp: 24.99,
        flavors: [
          'Pink No. 1 (Pink Punch Lemonade) 3mg', 'Pink No. 1 6mg',
          'Crimson No. 1 (Strawberry Crush) 3mg', 'Crimson No. 1 6mg',
          'Green No. 1 (Honeydew Melon) 3mg', 'Green No. 1 6mg',
          'Wild Red (Wild Watermelon Lemonade) 3mg', 'Wild Red 6mg',
          'Space No. 1 (Strawberry Kiwi Pop) 3mg', 'Space No. 1 6mg',
          'Rainbow No. 1 3mg', 'Rainbow No. 1 6mg',
          'Frosted Amber (Cookie Twist) 3mg', 'Frosted Amber 6mg'
        ]
      }
    ]
  },

  // 11. Botanicals & Kratom: OPMS, MIT45, Remarkable Herbs (35 items)
  {
    brand: 'OPMS',
    category: 'Kratom',
    series: [
      {
        model: 'OPMS Gold Liquid Extract 8.8ml Shot',
        size: '8.8ml',
        rate: 11.50,
        msrp: 21.99,
        flavors: [
          'Gold Liquid Extract Shot 8.8ml Single',
          'Gold Liquid Extract Shot 8.8ml (12ct Counter Box)',
          'Gold Liquid Extract Shot 8.8ml (45ct Master Case)'
        ]
      },
      {
        model: 'OPMS Black Liquid Extract 8.8ml Shot',
        size: '8.8ml',
        rate: 12.75,
        msrp: 24.99,
        flavors: [
          'Black Liquid Extract Shot 8.8ml Single',
          'Black Liquid Extract Shot 8.8ml (12ct Counter Box)',
          'Black Liquid Extract Shot 8.8ml (45ct Master Case)'
        ]
      },
      {
        model: 'OPMS Gold Extract Capsules',
        rate: 19.00,
        msrp: 38.99,
        flavors: [
          'Gold Extract Capsules 2-Count Pack',
          'Gold Extract Capsules 3-Count Pack',
          'Gold Extract Capsules 5-Count Pack',
          'Gold Extract Capsules (16pk Display Box 2ct)',
          'Gold Extract Capsules (16pk Display Box 3ct)',
          'Gold Extract Capsules (16pk Display Box 5ct)'
        ]
      },
      {
        model: 'OPMS Black Extract Capsules',
        rate: 21.50,
        msrp: 42.99,
        flavors: [
          'Black Extract Capsules 2-Count Pack',
          'Black Extract Capsules 3-Count Pack',
          'Black Extract Capsules 5-Count Pack',
          'Black Extract Capsules (16pk Display Box 2ct)',
          'Black Extract Capsules (16pk Display Box 3ct)',
          'Black Extract Capsules (16pk Display Box 5ct)'
        ]
      },
      {
        model: 'OPMS Silver Pure Kratom Powder',
        rate: 22.00,
        msrp: 45.00,
        flavors: [
          'Silver Maeng Da 16oz Powder', 'Silver Thai 16oz Powder',
          'Silver Malay 16oz Powder', 'Silver Bali 16oz Powder'
        ]
      }
    ]
  },
  {
    brand: 'MIT45',
    category: 'Kratom',
    series: [
      {
        model: 'MIT45 Liquid Extract Shots & Pouches',
        rate: 10.50,
        msrp: 19.99,
        flavors: [
          'MIT45 Gold Liquid Shot 15ml (Single)',
          'MIT45 Gold Liquid Shot 15ml (12ct Display)',
          'MIT45 Super K Extra Strong 30ml (Single)',
          'MIT45 Super K Extra Strong 30ml (12ct Display)',
          'MIT45 Boost Liquid Energy Shot (12ct Display)',
          'MIT45 GO Liquid Kratom Gel Pouches (12ct Display)',
          'MIT45 Raw Leaf Capsules 250ct Bottle',
          'MIT45 Raw Leaf Capsules 500ct Bottle'
        ]
      }
    ]
  },
  {
    brand: 'Remarkable Herbs',
    category: 'Kratom',
    series: [
      {
        model: 'Remarkable Herbs Premium Powder',
        rate: 14.50,
        msrp: 29.99,
        flavors: [
          'Green Vein Indo Powder 8oz', 'Green Vein Malay Powder 8oz',
          'Maeng Da Powder 8oz', 'Red Vein Bali Powder 8oz',
          'Maeng Da Powder 20oz Value Pouch', 'Green Vein Malay Powder 20oz Pouch'
        ]
      }
    ]
  },

  // 12. THCA, Hemp & Cannabinoids (35 items)
  {
    brand: 'Modus',
    category: 'THCA, CBD & Delta',
    series: [
      {
        model: 'Tap Out Blend 3g Disposable',
        size: '3 Grams',
        rate: 13.50,
        msrp: 29.99,
        flavors: [
          'Tap Out 3g - Lemon Vuitton', 'Tap Out 3g - Trap Star',
          'Tap Out 3g - Jealousy', 'Tap Out 3g - Apple Fritter',
          'Tap Out 3g - Mega Hurtz', 'Tap Out 3g - Zlushie'
        ]
      },
      {
        model: 'Uppercut Blend 3g Disposable',
        size: '3 Grams',
        rate: 13.50,
        msrp: 29.99,
        flavors: [
          'Uppercut 3g - Alaskan Thunder Fuck', 'Uppercut 3g - Guzzlerz',
          'Uppercut 3g - Oreoz', 'Uppercut 3g - Watermelon Zkittlez'
        ]
      }
    ]
  },
  {
    brand: 'Hidden Hills Club',
    category: 'THCA, CBD & Delta',
    series: [
      {
        model: 'VVS Diamond 2g Disposable & Gummies',
        rate: 14.00,
        msrp: 32.99,
        flavors: [
          'VVS 2g - Pink Rozay', 'VVS 2g - London Jelly', 'VVS 2g - White Gummy',
          'Night Night Blend Gummies 1000mg Sweet Dreams',
          'Fire Fire Live Resin Gummies 1000mg Citrus Punch',
          'Shield Blend 510 Carts 2g - Strawberry Cough',
          'Shield Blend 510 Carts 2g - Granddaddy Purple'
        ]
      }
    ]
  },
  {
    brand: 'Urb',
    category: 'THCA, CBD & Delta',
    series: [
      {
        model: 'Finest Flowers Live Resin Diamond Prerolls & Disposables',
        rate: 12.50,
        msrp: 26.99,
        flavors: [
          'THCA Diamond Indoor Flower Prerolls 5pk - Wedding Cake',
          'THCA Diamond Indoor Flower Prerolls 5pk - Gelato',
          'THCA Diamond Indoor Flower Prerolls 5pk - Skywalker OG',
          'THCA Diamond Indoor Flower Prerolls 5pk - Sour Diesel',
          'Smart Device 3g Disposable - Liquid Badder Guava Gelato',
          'Smart Device 3g Disposable - Live Resin Watermelon Shortcake',
          'Smart Device 3g Disposable - Blue Watermelon',
          'High Potency Delta 9 Live Rosin Gummies 35ct Jar'
        ]
      }
    ]
  },
  {
    brand: 'Flying Monkey',
    category: 'THCA, CBD & Delta',
    series: [
      {
        model: 'Heavy Hitter & King Kong Disposables',
        rate: 13.00,
        msrp: 28.99,
        flavors: [
          'Heavy Hitter 2g - Blueberry Afgoo', 'Heavy Hitter 2g - Mango Crush',
          'Heavy Hitter 2g - Sour Apple Killer', 'Heavy Hitter 2g - Strawnana',
          'King Kong 2.5g - Bonkers', 'King Kong 2.5g - White Runtz',
          'King Kong 2.5g - Maybach Kush', 'Delta 8 THC Gummies 500mg (20ct)'
        ]
      }
    ]
  },

  // 13. Pipes & Glass Hardware (35 items)
  {
    brand: 'Diamond Glass',
    category: 'Pipes & Glass',
    series: [
      {
        model: 'Classic Heavy Beakers & Tubes (7mm Borosilicate)',
        rate: 28.00,
        msrp: 69.99,
        flavors: [
          'Heavy Beaker Water Pipe 10-inch 7mm Clear',
          'Heavy Beaker Water Pipe 12-inch 7mm Emerald Green Accents',
          'Heavy Beaker Water Pipe 14-inch 9mm Super Thick Teal Accents',
          'Heavy Beaker Water Pipe 16-inch 9mm Tri-Color Monster Beaker',
          'Straight Tube Water Pipe 12-inch with Ice Pinch Clear',
          'Straight Tube Water Pipe 14-inch 7mm Midnight Black Rim',
          'Honeycomb Perc to Matrix Diffuser Water Pipe 14-inch',
          'Tree Perc Double Chamber Beaker Bong 15-inch',
          'Inline Matrix Recycler Rig 8-inch with 14mm Banger',
          'Klein Recycler Dab Rig 9-inch Clear with Amber Accents'
        ]
      },
      {
        model: 'Glass Accessories & Quartz Hardware',
        rate: 8.50,
        msrp: 19.99,
        flavors: [
          'Heavy Thick Spoon Pipe 4-inch Multi-Frit (10ct Display)',
          'Heavy Thick Spoon Pipe 5-inch Chameleon Glass',
          'Sherlock Hand Pipe 6-inch Swirl Accent',
          'Quartz Banger 14mm Male 90-Degree Flat Top 4mm Base',
          'Quartz Banger 14mm Male Terp Slurper with Marble Set',
          'Glass Bubble Carb Cap Directional Airflow',
          '14mm to 18mm Glass Downstem 4.5-inch Diffused 6-Slit',
          'Glass Ash Catcher 14mm 90-Degree Showerhead Perc'
        ]
      }
    ]
  },
  {
    brand: 'Eyce',
    category: 'Pipes & Glass',
    series: [
      {
        model: 'Platinum Cured Silicone Pipes & Rigs',
        rate: 22.50,
        msrp: 49.99,
        flavors: [
          'Eyce Silicone Beaker Water Pipe - Winter',
          'Eyce Silicone Beaker Water Pipe - Smoke',
          'Eyce Silicone Beaker Water Pipe - Creature',
          'Eyce Silicone Beaker Water Pipe - Black',
          'Eyce Silicone Rig II - Winter',
          'Eyce Silicone Rig II - Smoke',
          'Eyce Silicone Spoon Pipe with Glass Bowl - Smoke',
          'Eyce Silicone Spoon Pipe with Glass Bowl - Rasta',
          'Eyce Silicone Spoon Pipe with Glass Bowl - Creature',
          'Eyce Silicone ORAFLEX Beaker Water Pipe'
        ]
      }
    ]
  },

  // 14. Smoke Shop Essentials & Accessories (45 items)
  {
    brand: 'RAW',
    category: 'Accessories',
    series: [
      {
        model: 'Official RAW Rolling Papers & Cones Master Cartons',
        rate: 22.00,
        msrp: 48.00,
        flavors: [
          'RAW Classic King Size Slim Papers (50-Pack Full Box)',
          'RAW Classic 1-1/4 Size Papers (24-Pack Full Box)',
          'RAW Black King Size Slim Papers Ultra-Thin (50-Pack Full Box)',
          'RAW Black 1-1/4 Size Papers (24-Pack Full Box)',
          'RAW Organic Hemp King Size Slim Papers (50-Pack Full Box)',
          'RAW Organic Hemp 1-1/4 Papers (24-Pack Full Box)',
          'RAW Classic Pre-Rolled Cones 1-1/4 (32-Pack Retail Box)',
          'RAW Classic Pre-Rolled Cones King Size (20-Pack Retail Box)',
          'RAW Classic Pre-Rolled Cones King Size (Bulk 800-Count Tub)',
          'RAW Classic Pre-Rolled Cones 1-1/4 (Bulk 900-Count Tub)',
          'RAW Rolling Tray Metal Large (14x11 inch Classic)',
          'RAW Rolling Tray Metal Medium (11x7 inch Classic)',
          'RAW Cone Loader 1-1/4 & King Size Kit',
          'RAW Hemp Wick 100ft Ball'
        ]
      }
    ]
  },
  {
    brand: 'King Palm',
    category: 'Accessories',
    series: [
      {
        model: 'Natural Leaf Cones Display Boxes',
        rate: 19.50,
        msrp: 42.00,
        flavors: [
          'King Palm Slim 2pk (24ct Counter Display)',
          'King Palm Mini 5pk (15ct Counter Display)',
          'King Palm Rollie 4pk (20ct Counter Display)',
          'King Palm King 2pk (20ct Counter Display)',
          'King Palm Flavor Mini 2pk - Magic Mint (20ct Display)',
          'King Palm Flavor Mini 2pk - Watermelon Wave (20ct Display)',
          'King Palm Flavor Mini 2pk - Berry Terps (20ct Display)',
          'King Palm Flavor Mini 2pk - Banana Cream (20ct Display)',
          'King Palm Flavor Mini 2pk - Mango OG (20ct Display)'
        ]
      }
    ]
  },
  {
    brand: 'Smoke Essentials',
    category: 'Novelties',
    series: [
      {
        model: 'Torches, Butane, Scales & Grinders',
        rate: 18.00,
        msrp: 38.00,
        flavors: [
          'Newport Zero Extra Purified Butane 300ml (12-Can Master Case)',
          'Neon 11x Ultra Refined Butane 400ml (12-Can Master Case)',
          'Special Blue Monster Multi-Angle Torch (Display Box)',
          'Scorch Torch Triple Jet Flame Torch with Punch Cutter (9ct Display)',
          'Blink Neon Double Jet Torch Lighter (12ct Display Box)',
          'Precision Digital Pocket Scale 0.01g x 500g (10ct Display)',
          'Precision Digital Pocket Scale 0.1g x 1000g (10ct Display)',
          'Aircraft Grade Aluminum 4-Piece Herb Grinder 63mm Matte Black',
          'Aircraft Grade Aluminum 4-Piece Herb Grinder 50mm Gunmetal',
          'Aircraft Grade Aluminum 4-Piece Herb Grinder 63mm Rainbow Neo-Chrome',
          'Cookies 510 Thread Variable Voltage Battery (24ct Display)',
          'Yocan Kodo Pro 510 Box Mod OLED Display (20ct Counter Box)'
        ]
      }
    ]
  }
];

function generateZohoCatalog(): InventoryItem[] {
  const items: InventoryItem[] = [];
  let itemCounter = 1000;

  for (const b of BRANDS_CATALOG) {
    for (const s of b.series) {
      for (const fl of s.flavors) {
        itemCounter++;
        let itemId = `ZOHO-ITM-${itemCounter}`;
        if (s.model === 'Pulse 15k' && fl === 'Blow Pop') itemId = 'geekbar-15k';
        else if (s.model === 'Pulse X 25k' && fl === 'Lime Berry Orange') itemId = 'geekbar-25k';
        else if (s.model === 'Pulse Ultra 60k' && fl.includes('Miami Mint')) itemId = 'geekbar-60k';
        else if (s.model === 'DC25000' && fl === 'Night Crawler') itemId = 'raz-25k';
        else if (s.model.includes('Mega 50K') && fl.includes('Blue Razz')) itemId = 'vozol-50k';
        else if (s.model.includes('Switch Pro 30K') && fl.includes('Sour Apple')) itemId = 'foger-30k';

        const cleanSku = `${b.brand.slice(0, 3).toUpperCase()}-${fl.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}-${itemCounter % 1000}`;
        const productName = `${b.brand} ${s.model} - ${fl}`;

        const imageUrl = productImageRegistry.resolveProductImage({
          name: productName,
          brand: b.brand,
          sku: cleanSku,
          category: b.category,
          description: `${productName} distributed by Wholesale of Oklahoma. Available for wholesale case order with live pricing and immediate dispatch.`,
        });

        const item: InventoryItem = {
          id: itemId,
          zoho_item_id: itemId,
          sku: cleanSku,
          name: productName,
          brand: b.brand,
          category: b.category,
          subcategory: s.model,
          description: `Authentic factory-sealed ${productName}. Licensed Oklahoma B2B distribution direct from Oklahoma City warehouse. Anti-counterfeit verification QR code intact on every carton.`,
          image_url: imageUrl,
          rate: s.rate,
          retail_msrp: s.msrp,
          purchase_rate: Math.round(s.rate * 0.65 * 100) / 100,
          available_stock: 50,
          stock_on_hand: 50,
          stock_status: 'in_stock',
          status: 'active',
          unit: 'Pack',
          min_order_qty: 1,
          bulk_pricing: [],
          specs: {
            size: s.size,
            nicotine: s.nicotine || (b.category === 'Disposable Vapes' ? '5%' : undefined),
            puffs: s.puffs,
            origin: 'USA Distributed · Licensed OK Warehouse',
          },
          features: [
            'Factory Sealed Case Master Packaging',
            'Authentic Verification QR Codes',
            'Same-Day OKC Warehouse Pickup Available'
          ],
          badge: s.model.includes('15k') || s.model.includes('30K') || s.model.includes('25k') ? '🔥 High Velocity' : undefined,
          last_modified_time: new Date().toISOString(),
        };

        items.push(item);
      }
    }
  }

  return items;
}

const allItems = generateZohoCatalog();
const outJsonPath = path.resolve(__dirname, '../data/zoho_catalog_snapshot.json');
fs.writeFileSync(outJsonPath, JSON.stringify(allItems, null, 2), 'utf-8');

const outTsPath = path.resolve(__dirname, '../src/server/zohoSnapshotData.ts');
const tsContent = `// Automatically generated from data/zoho_catalog_snapshot.json
// Direct TypeScript export to avoid Vercel serverless filesystem read errors.
export const ZOHO_CATALOG_SNAPSHOT = ${JSON.stringify(allItems, null, 2)} as const;
`;
fs.writeFileSync(outTsPath, tsContent, 'utf-8');

console.log(`Successfully generated ${allItems.length} Zoho items without unit pricing tiers into ${outJsonPath} and ${outTsPath}`);
