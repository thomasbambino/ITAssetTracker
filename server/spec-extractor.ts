// Device specification extraction from brand and model information
interface DeviceSpecs {
  processor?: string;
  memory?: string;
  storage?: string;
  graphics?: string;
  display?: string;
  connectivity?: string;
  ports?: string;
  battery?: string;
  weight?: string;
  features?: string;
  form_factor?: string;
  dimensions?: string;
}

// Database of device specifications based on brand/model combinations
const DEVICE_SPEC_DATABASE: Record<string, DeviceSpecs> = {
  // Apple devices - exact matches from database
  'apple_macbook_pro_14-inch_2021': {
    processor: 'Apple M1 Pro',
    memory: '16GB Unified Memory',
    storage: '512GB SSD',
    graphics: '16-core GPU',
    display: '14.2-inch Liquid Retina XDR',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0',
    ports: '3x Thunderbolt 4, HDMI, SD card slot',
    battery: '70Wh',
    weight: '3.5 lbs'
  },
  'apple_macbook_pro_14_m3': {
    processor: 'Apple M3',
    memory: '16GB Unified Memory',
    storage: '512GB SSD',
    graphics: '18-core GPU',
    display: '14.2-inch Liquid Retina XDR',
    connectivity: 'Wi-Fi 6E, Bluetooth 5.3',
    ports: '3x Thunderbolt 4, HDMI, SD card slot',
    battery: '70Wh',
    weight: '3.5 lbs'
  },
  'apple_macbook_air_m2_2022': {
    processor: 'Apple M2',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '10-core GPU',
    display: '13.6-inch Liquid Retina',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0',
    ports: '2x Thunderbolt/USB 4, MagSafe 3',
    battery: '52.6Wh',
    weight: '2.7 lbs'
  },
  'apple_13-inmacbook_pro': {
    processor: 'Intel Core i5',
    memory: '8GB DDR3',
    storage: '256GB SSD',
    graphics: 'Intel Iris Pro Graphics',
    display: '13.3-inch Retina',
    connectivity: 'Wi-Fi 5, Bluetooth 4.0',
    ports: '2x Thunderbolt 2, USB 3.0',
    battery: '71.8Wh',
    weight: '3.57 lbs'
  },
  'apple_macbook_pro': {
    processor: 'Intel Core i7',
    memory: '16GB DDR4',
    storage: '512GB SSD',
    graphics: 'Intel Iris Pro Graphics',
    display: '13.3-inch Retina',
    connectivity: 'Wi-Fi 5, Bluetooth 4.0',
    ports: '2x Thunderbolt 3, USB 3.0',
    battery: '58.2Wh',
    weight: '3.02 lbs'
  },
  'apple_air': {
    processor: 'Apple M1',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '7-core GPU',
    display: '13.3-inch Retina',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0',
    ports: '2x Thunderbolt/USB 4',
    battery: '49.9Wh',
    weight: '2.8 lbs'
  },
  'apple_mac_mini_m1_2020': {
    processor: 'Apple M1',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '8-core GPU',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0, Gigabit Ethernet',
    ports: '2x Thunderbolt/USB 4, 2x USB-A, HDMI 2.0',
    form_factor: 'Desktop Mini',
    dimensions: '7.7 x 7.7 x 1.4 inches'
  },
  'apple_mac_mini': {
    processor: 'Apple M1',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '8-core GPU',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0, Gigabit Ethernet',
    ports: '2x Thunderbolt/USB 4, 2x USB-A, HDMI 2.0',
    form_factor: 'Desktop Mini',
    dimensions: '7.7 x 7.7 x 1.4 inches'
  },
  'apple_mini': {
    processor: 'Apple M2',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '10-core GPU',
    connectivity: 'Wi-Fi 6E, Bluetooth 5.3, Gigabit Ethernet',
    ports: '2x Thunderbolt 4, 2x USB-A, HDMI',
    form_factor: 'Desktop Mini',
    dimensions: '7.7 x 7.7 x 1.4 inches'
  },
  'apple_10.9_ipad_10th_gen_w/_wifi': {
    processor: 'Apple A14 Bionic',
    memory: '4GB RAM',
    storage: '64GB',
    display: '10.9-inch Liquid Retina',
    connectivity: 'Wi-Fi 6, Bluetooth 5.2',
    battery: '28.6Wh',
    weight: '1.05 lbs',
    features: 'Touch ID, Apple Pencil support'
  },
  'apple_11-inch_ipad_pro_wi-fi_256gb_-_space_gray': {
    processor: 'Apple M2',
    memory: '8GB RAM',
    storage: '256GB',
    display: '11-inch Liquid Retina',
    connectivity: 'Wi-Fi 6E, Bluetooth 5.3',
    battery: '28.65Wh',
    weight: '1.03 lbs',
    features: 'Face ID, Apple Pencil support, ProMotion'
  },
  'apple_apple_ipad': {
    processor: 'Apple A12 Bionic',
    memory: '3GB RAM',
    storage: '32GB',
    display: '10.2-inch Retina',
    connectivity: 'Wi-Fi 5, Bluetooth 5.0',
    battery: '32.4Wh',
    weight: '1.07 lbs',
    features: 'Touch ID, Apple Pencil support'
  },
  'apple_macbook_pro_14_m3': {
    processor: 'Apple M3',
    memory: '16GB Unified Memory',
    storage: '512GB SSD',
    graphics: '18-core GPU',
    display: '14.2-inch Liquid Retina XDR',
    connectivity: 'Wi-Fi 6E, Bluetooth 5.3',
    ports: '3x Thunderbolt 4, HDMI, SD card slot',
    battery: '70Wh',
    weight: '3.5 lbs'
  },
  'apple_macbook_air_m2_2022': {
    processor: 'Apple M2',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '10-core GPU',
    display: '13.6-inch Liquid Retina',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0',
    ports: '2x Thunderbolt/USB 4, MagSafe 3',
    battery: '52.6Wh',
    weight: '2.7 lbs'
  },
  'apple_13-inmacbook_pro': {
    processor: 'Intel Core i5',
    memory: '8GB DDR3',
    storage: '256GB SSD',
    graphics: 'Intel Iris Pro Graphics',
    display: '13.3-inch Retina',
    connectivity: 'Wi-Fi 5, Bluetooth 4.0',
    ports: '2x Thunderbolt 2, USB 3.0',
    battery: '71.8Wh',
    weight: '3.57 lbs'
  },
  'apple_mac_mini_m1_2020': {
    processor: 'Apple M1',
    memory: '8GB Unified Memory',
    storage: '256GB SSD',
    graphics: '8-core GPU',
    connectivity: 'Wi-Fi 6, Bluetooth 5.0, Gigabit Ethernet',
    ports: '2x Thunderbolt/USB 4, 2x USB-A, HDMI 2.0',
    form_factor: 'Desktop Mini',
    dimensions: '7.7 x 7.7 x 1.4 inches'
  },
  'apple_10.9_ipad_10th_gen_w/_wifi': {
    processor: 'Apple A14 Bionic',
    memory: '4GB RAM',
    storage: '64GB',
    display: '10.9-inch Liquid Retina',
    connectivity: 'Wi-Fi 6, Bluetooth 5.2',
    battery: '28.6Wh',
    weight: '1.05 lbs',
    features: 'Touch ID, Apple Pencil support'
  },
  'apple_11-inch_ipad_pro_wi-fi_256gb_-_space_gray': {
    processor: 'Apple M2',
    memory: '8GB RAM',
    storage: '256GB',
    display: '11-inch Liquid Retina',
    connectivity: 'Wi-Fi 6E, Bluetooth 5.3',
    battery: '28.65Wh',
    weight: '1.03 lbs',
    features: 'Face ID, Apple Pencil support, ProMotion'
  },

  // Dell devices
  'dell_precision_5490': {
    processor: 'Intel Core i7-11370H',
    memory: '16GB DDR4',
    storage: '512GB SSD',
    graphics: 'Intel Iris Xe Graphics',
    display: '14-inch FHD',
    connectivity: 'Wi-Fi 6, Bluetooth 5.1',
    ports: '2x Thunderbolt 4, USB-A 3.2',
    battery: '52Wh',
    weight: '3.26 lbs'
  },
  'dell_vostro_7620': {
    processor: 'Intel Core i7-11800H',
    memory: '16GB DDR4',
    storage: '512GB SSD',
    graphics: 'NVIDIA GeForce RTX 3050 Ti',
    display: '16.1-inch FHD',
    connectivity: 'Wi-Fi 6, Bluetooth 5.1',
    ports: '3x USB-A, 1x USB-C, HDMI, SD card',
    battery: '56Wh',
    weight: '4.62 lbs'
  },
  'dell_optiplex_micro_7020': {
    processor: 'Intel Core i5-12400',
    memory: '8GB DDR4',
    storage: '256GB SSD',
    graphics: 'Intel UHD Graphics 730',
    connectivity: 'Wi-Fi 6, Bluetooth 5.2, Gigabit Ethernet',
    ports: '6x USB (4x USB-A, 2x USB-C), HDMI, DisplayPort',
    form_factor: 'Micro Desktop',
    dimensions: '6.97 x 6.96 x 1.37 inches'
  },

  // HP devices
  'hp_hp_laptop_17': {
    processor: 'Intel Core i5-1135G7',
    memory: '8GB DDR4',
    storage: '256GB SSD',
    graphics: 'Intel Iris Xe Graphics',
    display: '17.3-inch HD+',
    connectivity: 'Wi-Fi 5, Bluetooth 5.0',
    ports: '2x USB-A, 1x USB-C, HDMI, SD card',
    battery: '41Wh',
    weight: '4.6 lbs'
  },

  // Custom builds
  'custom_mini_pc_ryzen_9': {
    processor: 'AMD Ryzen 9 5900X',
    memory: '32GB DDR4',
    storage: '1TB NVMe SSD',
    graphics: 'AMD Radeon RX 6600 XT',
    connectivity: 'Wi-Fi 6, Bluetooth 5.2, Gigabit Ethernet',
    ports: '8x USB (6x USB-A, 2x USB-C), HDMI, DisplayPort',
    form_factor: 'Mini PC',
    dimensions: '7.5 x 7.5 x 2.5 inches'
  },
  'custom_custom_built_workstations_amd_ryzen_3_2200g': {
    processor: 'AMD Ryzen 3 2200G',
    memory: '16GB DDR4',
    storage: '512GB SSD',
    graphics: 'AMD Radeon Vega 8',
    connectivity: 'Wi-Fi 5, Bluetooth 4.2, Gigabit Ethernet',
    ports: '6x USB, HDMI, DisplayPort, VGA',
    form_factor: 'Desktop Tower'
  }
};

/**
 * Create a normalized key from brand and model for spec lookup
 */
function createSpecKey(brand: string, model: string): string {
  return `${brand.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${model.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Extract device specifications from brand and model information
 */
export function extractDeviceSpecs(brand: string, model: string): DeviceSpecs | null {
  if (!brand || !model) {
    return null;
  }

  const specKey = createSpecKey(brand, model);
  const specs = DEVICE_SPEC_DATABASE[specKey];
  
  if (specs) {
    return specs;
  }

  // Try partial matches for common patterns
  const normalizedBrand = brand.toLowerCase();
  const normalizedModel = model.toLowerCase();

  // Apple device patterns
  if (normalizedBrand.includes('apple')) {
    if (normalizedModel.includes('macbook pro') && normalizedModel.includes('14')) {
      return DEVICE_SPEC_DATABASE['apple_macbook_pro_14-inch_2021'];
    }
    if (normalizedModel.includes('macbook air') && normalizedModel.includes('m2')) {
      return DEVICE_SPEC_DATABASE['apple_macbook_air_m2_2022'];
    }
    if (normalizedModel.includes('mac mini')) {
      return DEVICE_SPEC_DATABASE['apple_mac_mini_m1_2020'];
    }
    if (normalizedModel.includes('ipad pro') && normalizedModel.includes('11')) {
      return DEVICE_SPEC_DATABASE['apple_11-inch_ipad_pro_wi-fi_256gb_-_space_gray'];
    }
    if (normalizedModel.includes('ipad') && normalizedModel.includes('10')) {
      return DEVICE_SPEC_DATABASE['apple_10.9_ipad_10th_gen_w/_wifi'];
    }
  }

  // Dell device patterns
  if (normalizedBrand.includes('dell')) {
    if (normalizedModel.includes('precision')) {
      return DEVICE_SPEC_DATABASE['dell_precision_5490'];
    }
    if (normalizedModel.includes('vostro')) {
      return DEVICE_SPEC_DATABASE['dell_vostro_7620'];
    }
    if (normalizedModel.includes('optiplex')) {
      return DEVICE_SPEC_DATABASE['dell_optiplex_micro_7020'];
    }
  }

  // HP device patterns
  if (normalizedBrand.includes('hp')) {
    if (normalizedModel.includes('laptop')) {
      return DEVICE_SPEC_DATABASE['hp_hp_laptop_17'];
    }
  }

  // Custom builds
  if (normalizedModel.includes('ryzen 9')) {
    return DEVICE_SPEC_DATABASE['custom_mini_pc_ryzen_9'];
  }
  if (normalizedModel.includes('ryzen 3')) {
    return DEVICE_SPEC_DATABASE['custom_custom_built_workstations_amd_ryzen_3_2200g'];
  }

  return null;
}

/**
 * Update device specifications in the database based on existing brand/model data
 */
export async function updateDeviceSpecifications(db: any): Promise<number> {
  try {
    // Get all devices without specs
    const devices = await db.query(`
      SELECT id, brand, model 
      FROM devices 
      WHERE (specs IS NULL OR specs = '{}' OR specs = '') 
      AND brand IS NOT NULL 
      AND model IS NOT NULL
    `);

    let updatedCount = 0;

    for (const device of devices) {
      const specs = extractDeviceSpecs(device.brand, device.model);
      
      if (specs) {
        await db.query(
          'UPDATE devices SET specs = $1 WHERE id = $2',
          [JSON.stringify(specs), device.id]
        );
        updatedCount++;
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('Error updating device specifications:', error);
    return 0;
  }
}