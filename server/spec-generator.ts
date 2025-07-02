import fetch from 'node-fetch';

interface DeviceSpecRequest {
  brand: string;
  model: string;
  category: string;
}

interface GeneratedSpecs {
  [key: string]: string;
}

export class DeviceSpecGenerator {
  private async searchDeviceSpecs(brand: string, model: string, category: string): Promise<GeneratedSpecs | null> {
    try {
      // For devices like phones, tablets, accessories, etc. we can try to generate basic specs
      const normalizedBrand = brand.toLowerCase().trim();
      const normalizedModel = model.toLowerCase().trim();
      const normalizedCategory = category.toLowerCase().trim();

      // Apple devices - we can provide known specs for common Apple products
      if (normalizedBrand.includes('apple')) {
        return this.generateAppleDeviceSpecs(normalizedModel, normalizedCategory);
      }

      // Samsung devices
      if (normalizedBrand.includes('samsung')) {
        return this.generateSamsungDeviceSpecs(normalizedModel, normalizedCategory);
      }

      // Microsoft devices
      if (normalizedBrand.includes('microsoft')) {
        return this.generateMicrosoftDeviceSpecs(normalizedModel, normalizedCategory);
      }

      // Generic device specs based on category
      return this.generateGenericSpecs(normalizedModel, normalizedCategory);

    } catch (error) {
      console.error('Error generating device specs:', error);
      return null;
    }
  }

  private generateAppleDeviceSpecs(model: string, category: string): GeneratedSpecs {
    const specs: GeneratedSpecs = {};

    // iPad models
    if (model.includes('ipad')) {
      if (model.includes('pro')) {
        specs.display = model.includes('11') ? '11-inch Liquid Retina' : '12.9-inch Liquid Retina XDR';
        specs.processor = 'Apple M2 chip';
        specs.storage = '128GB - 2TB options';
        specs.connectivity = 'Wi-Fi 6E, Optional 5G';
        specs.cameras = '12MP Wide, 10MP Ultra Wide';
      } else if (model.includes('air')) {
        specs.display = '10.9-inch Liquid Retina';
        specs.processor = 'Apple M1 chip';
        specs.storage = '64GB - 256GB options';
        specs.connectivity = 'Wi-Fi 6, Optional 5G';
      } else {
        specs.display = '10.2-inch Retina';
        specs.processor = 'A13 Bionic chip';
        specs.storage = '64GB - 256GB options';
        specs.connectivity = 'Wi-Fi, Optional LTE';
      }
    }

    // iPhone models
    if (model.includes('iphone')) {
      if (model.includes('pro')) {
        specs.display = model.includes('max') ? '6.7-inch Super Retina XDR' : '6.1-inch Super Retina XDR';
        specs.processor = 'A16 Bionic chip';
        specs.storage = '128GB - 1TB options';
        specs.cameras = 'Pro camera system with 48MP Main';
        specs.connectivity = '5G, Wi-Fi 6E, Bluetooth 5.3';
      } else {
        specs.display = '6.1-inch Super Retina XDR';
        specs.processor = 'A15 Bionic chip';
        specs.storage = '128GB - 512GB options';
        specs.cameras = 'Dual camera system';
        specs.connectivity = '5G, Wi-Fi 6, Bluetooth 5.3';
      }
    }

    // Apple Watch
    if (model.includes('watch')) {
      if (model.includes('ultra')) {
        specs.display = '49mm Titanium case';
        specs.processor = 'S8 SiP';
        specs.storage = '32GB';
        specs.connectivity = 'GPS, Cellular, Wi-Fi, Bluetooth 5.3';
        specs.battery = 'Up to 36 hours';
      } else {
        specs.display = model.includes('45') ? '45mm case' : '41mm case';
        specs.processor = 'S8 SiP';
        specs.storage = '32GB';
        specs.connectivity = 'GPS, Optional Cellular';
        specs.battery = 'Up to 18 hours';
      }
    }

    // AirPods
    if (model.includes('airpods')) {
      if (model.includes('pro')) {
        specs.drivers = 'Custom high-excursion driver';
        specs.features = 'Active Noise Cancellation, Transparency mode';
        specs.battery = 'Up to 6 hours listening time';
        specs.connectivity = 'Bluetooth 5.3';
        specs.controls = 'Force sensor';
      } else if (model.includes('max')) {
        specs.drivers = '40mm dynamic driver';
        specs.features = 'Active Noise Cancellation, Transparency mode';
        specs.battery = 'Up to 20 hours listening time';
        specs.connectivity = 'Bluetooth 5.0, Lightning, 3.5mm';
        specs.weight = '384.8 grams';
      } else {
        specs.drivers = 'Custom high-excursion driver';
        specs.battery = 'Up to 6 hours listening time';
        specs.connectivity = 'Bluetooth 5.3';
        specs.controls = 'Double-tap to play, skip, answer calls';
      }
    }

    // Apple Pencil
    if (model.includes('pencil')) {
      if (model.includes('2nd')) {
        specs.compatibility = 'iPad Pro, iPad Air, iPad mini';
        specs.features = 'Double-tap to switch tools, Magnetic attachment';
        specs.charging = 'Wireless charging and pairing';
        specs.pressure = 'Pressure and tilt sensitivity';
        specs.latency = 'Low latency';
      } else {
        specs.compatibility = 'iPad (6th gen and later)';
        specs.charging = 'Lightning connector';
        specs.pressure = 'Pressure and tilt sensitivity';
        specs.latency = 'Low latency';
      }
    }

    // Magic Keyboard/Mouse/Trackpad
    if (model.includes('magic')) {
      if (model.includes('keyboard')) {
        specs.layout = 'QWERTY';
        specs.keys = 'Scissor mechanism with 1mm travel';
        specs.connectivity = 'Bluetooth, Lightning connector';
        specs.battery = 'Built-in rechargeable battery';
        if (model.includes('trackpad')) {
          specs.trackpad = 'Multi-Touch trackpad';
        }
      } else if (model.includes('mouse')) {
        specs.connectivity = 'Bluetooth, Lightning connector';
        specs.surface = 'Multi-Touch surface';
        specs.battery = 'Built-in rechargeable battery';
        specs.tracking = 'Laser tracking';
      } else if (model.includes('trackpad')) {
        specs.surface = 'Multi-Touch surface';
        specs.connectivity = 'Bluetooth, Lightning connector';
        specs.battery = 'Built-in rechargeable battery';
        specs.force = 'Force Touch technology';
      }
    }

    return specs;
  }

  private generateSamsungDeviceSpecs(model: string, category: string): GeneratedSpecs {
    const specs: GeneratedSpecs = {};

    // Samsung Galaxy phones
    if (model.includes('galaxy') && (model.includes('s') || model.includes('note'))) {
      if (model.includes('ultra')) {
        specs.display = '6.8-inch Dynamic AMOLED 2X';
        specs.processor = 'Snapdragon 8 Gen 2';
        specs.storage = '256GB - 1TB options';
        specs.cameras = '200MP Main, 12MP Ultra Wide';
        specs.battery = '5000mAh';
        specs.connectivity = '5G, Wi-Fi 6E, Bluetooth 5.3';
      } else {
        specs.display = '6.1-inch Dynamic AMOLED 2X';
        specs.processor = 'Snapdragon 8 Gen 2';
        specs.storage = '128GB - 512GB options';
        specs.cameras = '50MP Main, 12MP Ultra Wide';
        specs.battery = '3900mAh';
        specs.connectivity = '5G, Wi-Fi 6, Bluetooth 5.3';
      }
    }

    // Samsung tablets
    if (model.includes('tab')) {
      specs.display = '11-inch TFT LCD';
      specs.processor = 'Snapdragon 680';
      specs.storage = '64GB - 256GB options';
      specs.connectivity = 'Wi-Fi, Optional LTE';
      specs.battery = '7040mAh';
    }

    return specs;
  }

  private generateMicrosoftDeviceSpecs(model: string, category: string): GeneratedSpecs {
    const specs: GeneratedSpecs = {};

    // Surface devices
    if (model.includes('surface')) {
      if (model.includes('pro')) {
        specs.display = '13-inch PixelSense touchscreen';
        specs.processor = 'Intel Core i5/i7';
        specs.ram = '8GB - 32GB options';
        specs.storage = '128GB - 1TB SSD';
        specs.connectivity = 'Wi-Fi 6E, Bluetooth 5.1';
        specs.ports = '2x USB-C, Surface Connect';
      } else if (model.includes('laptop')) {
        specs.display = '13.5-inch PixelSense touchscreen';
        specs.processor = 'Intel Core i5/i7';
        specs.ram = '8GB - 32GB options';
        specs.storage = '256GB - 1TB SSD';
        specs.connectivity = 'Wi-Fi 6, Bluetooth 5.0';
        specs.ports = 'USB-A, USB-C, Surface Connect';
      }
    }

    return specs;
  }

  private generateGenericSpecs(model: string, category: string): GeneratedSpecs {
    const specs: GeneratedSpecs = {};

    // Generic specs based on category
    switch (category) {
      case 'monitor':
      case 'display':
        specs.display = 'LED/LCD display';
        specs.resolution = 'Full HD or higher';
        specs.connectivity = 'HDMI, DisplayPort, USB-C';
        specs.refresh_rate = '60Hz - 144Hz';
        break;

      case 'printer':
        specs.type = 'Inkjet/Laser printer';
        specs.connectivity = 'Wi-Fi, USB, Ethernet';
        specs.print_speed = 'Variable pages per minute';
        specs.paper_size = 'A4, Letter size support';
        break;

      case 'phone':
      case 'smartphone':
        specs.display = 'Touchscreen display';
        specs.connectivity = '4G/5G, Wi-Fi, Bluetooth';
        specs.cameras = 'Front and rear cameras';
        specs.storage = 'Internal storage with expansion options';
        break;

      case 'tablet':
        specs.display = 'Touchscreen display';
        specs.connectivity = 'Wi-Fi, Optional cellular';
        specs.cameras = 'Front and rear cameras';
        specs.storage = 'Internal storage options';
        specs.battery = 'All-day battery life';
        break;

      case 'headphones':
      case 'earphones':
        specs.type = 'Over-ear/In-ear headphones';
        specs.connectivity = 'Wired/Wireless connection';
        specs.features = 'Noise cancellation options';
        specs.battery = 'Battery life (wireless models)';
        break;

      case 'keyboard':
        specs.layout = 'QWERTY layout';
        specs.connectivity = 'USB/Wireless connection';
        specs.type = 'Mechanical/Membrane keys';
        break;

      case 'mouse':
        specs.connectivity = 'USB/Wireless connection';
        specs.tracking = 'Optical/Laser tracking';
        specs.buttons = 'Left, right, scroll wheel';
        break;

      case 'webcam':
      case 'camera':
        specs.resolution = 'HD/Full HD video';
        specs.connectivity = 'USB connection';
        specs.features = 'Auto-focus, built-in microphone';
        break;

      default:
        specs.type = 'Electronic device';
        specs.connectivity = 'Standard connectivity options';
        break;
    }

    return specs;
  }

  public async generateSpecs(request: DeviceSpecRequest): Promise<GeneratedSpecs | null> {
    const { brand, model, category } = request;
    
    if (!brand || !model) {
      return null;
    }

    return await this.searchDeviceSpecs(brand, model, category);
  }
}

export const specGenerator = new DeviceSpecGenerator();