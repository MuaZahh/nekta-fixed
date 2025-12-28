import manifestData from '../assets/app-manifest.json';

const manifest = manifestData as Manifest;


// ============ Types ============

export interface AspectRatioInfo {
  label: string;
  value: number;
}

export interface SizeConfigAspectRatio {
  type: 'aspectRatio';
  aspectRatios: string[];
  resolutions?: string[];
  defaultDimension?: number;
  default: { aspectRatio: string; resolution?: string };
}

export interface SizeConfigDimensions {
  type: 'dimensions';
  min: number;
  max: number;
  step: number;
  maxMegapixels?: number;
  default: { width: number; height: number };
}

export interface SizeConfigPresetGrid {
  type: 'presetGrid';
  aspectRatios: string[];
  resolutions?: string[];
  sizes: Record<string, [number, number]> | Record<string, Record<string, [number, number]>>;
  customRatioRange?: { min: string; max: string };
  default: { aspectRatio: string; resolution?: string };
}

export type SizeConfig = SizeConfigAspectRatio | SizeConfigDimensions | SizeConfigPresetGrid;

export interface ImageModel {
  id: string;
  name: string;
  maker: string;
  sizeConfig: SizeConfig;
}

export interface ProviderModel {
  modelId: string;
  providerModelId: string;
}

export interface Provider {
  id: string;
  name: string;
  imageModels: ProviderModel[];
}

export interface Manifest {
  version: string;
  imageModels: ImageModel[];
  providers: Provider[];
  aspectRatios: Record<string, AspectRatioInfo>;
}

export interface ModelResult {
  modelId: string;
  providerModelId: string;
  name: string;
  maker: string;
  maxDimension: number;
  supportedRatios: string[];
}

export interface ProviderResult {
  providerName: string;
  models: ModelResult[];
}

export interface GetModelsResult {
  [providerId: string]: ProviderResult;
}

export interface GetModelsOptions {
  maxSize?: number;
  ratios?: string[];
}

export interface ImageSizeResult {
  width: number;
  height: number;
  aspectRatio: string;
  clamped: boolean;
  preset?: string;
}



function parseAspectRatio(ratio: string): number {
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
}

function getModelMaxDimension(model: ImageModel): number {
  const config = model.sizeConfig;

  switch (config.type) {
    case 'dimensions':
      return config.max;

    case 'aspectRatio':
      if (config.resolutions?.includes('4K')) return 4096;
      if (config.resolutions?.includes('2K')) return 2048;
      return config.defaultDimension || 1024;

    case 'presetGrid': {
      let maxDim = 0;
      const sizes = config.sizes;

      if (config.resolutions) {
        for (const resolution of config.resolutions) {
          const tierSizes = sizes[resolution] as Record<string, [number, number]> | undefined;
          if (tierSizes && typeof tierSizes === 'object') {
            for (const dims of Object.values(tierSizes)) {
              if (Array.isArray(dims)) {
                maxDim = Math.max(maxDim, dims[0], dims[1]);
              }
            }
          }
        }
      } else {
        for (const value of Object.values(sizes)) {
          if (Array.isArray(value) && typeof value[0] === 'number') {
            maxDim = Math.max(maxDim, value[0], value[1]);
          }
        }
      }
      return maxDim || 1024;
    }

    default:
      return 1024;
  }
}

function modelSupportsRatio(model: ImageModel, ratio: string): boolean {
  const config = model.sizeConfig;

  switch (config.type) {
    case 'aspectRatio':
    case 'presetGrid':
      return config.aspectRatios.includes(ratio);

    case 'dimensions':
      return true;

    default:
      return false;
  }
}

function getModelSupportedRatios(model: ImageModel): string[] {
  const config = model.sizeConfig;

  switch (config.type) {
    case 'aspectRatio':
    case 'presetGrid':
      return config.aspectRatios;

    case 'dimensions':
      return Object.keys(manifest.aspectRatios);

    default:
      return [];
  }
}

// ============ Functions ============

export function getModels(options: GetModelsOptions = {}): GetModelsResult {
  const { maxSize, ratios } = options;

  const result: GetModelsResult = {};

  for (const provider of manifest.providers) {
    const matchingModels: ModelResult[] = [];

    for (const providerModel of provider.imageModels) {
      const model = manifest.imageModels.find(m => m.id === providerModel.modelId);
      if (!model) continue;

      const modelMaxDim = getModelMaxDimension(model);

      if (maxSize && modelMaxDim < maxSize) {
        continue;
      }

      if (ratios && ratios.length > 0) {
        const supportsAllRatios = ratios.every(ratio => modelSupportsRatio(model, ratio));
        if (!supportsAllRatios) {
          continue;
        }
      }

      matchingModels.push({
        modelId: providerModel.modelId,
        providerModelId: providerModel.providerModelId,
        name: model.name,
        maker: model.maker,
        maxDimension: modelMaxDim,
        supportedRatios: getModelSupportedRatios(model)
      });
    }

    if (matchingModels.length > 0) {
      result[provider.id] = {
        providerName: provider.name,
        models: matchingModels
      };
    }
  }

  return result;
}

export function getImageSize(
  maxSize: number,
  ratio: string,
  providerId: string,
  modelId: string
): ImageSizeResult | null {

  const provider = manifest.providers.find(p => p.id === providerId);
  if (!provider) return null;

  const providerModel = provider.imageModels.find(m => m.modelId === modelId);
  if (!providerModel) return null;

  const model = manifest.imageModels.find(m => m.id === modelId);
  if (!model) return null;

  const config = model.sizeConfig;
  const ratioValue = parseAspectRatio(ratio);

  switch (config.type) {
    case 'presetGrid': {
      if (!config.aspectRatios.includes(ratio)) {
        return null;
      }

      if (config.resolutions) {
        const tiers = [...config.resolutions].reverse(); 

        for (const tier of tiers) {
          const tierSizes = config.sizes[tier] as Record<string, [number, number]> | undefined;
          if (!tierSizes || !tierSizes[ratio]) continue;

          const [w, h] = tierSizes[ratio];
          if (Math.max(w, h) <= maxSize) {
            return {
              width: w,
              height: h,
              aspectRatio: ratio,
              clamped: false,
              preset: tier
            };
          }
        }

        const smallestTier = config.resolutions[0];
        const smallestSizes = config.sizes[smallestTier] as Record<string, [number, number]> | undefined;
        if (smallestSizes && smallestSizes[ratio]) {
          const [w, h] = smallestSizes[ratio];
          return {
            width: w,
            height: h,
            aspectRatio: ratio,
            clamped: true,
            preset: smallestTier
          };
        }
        return null;
      }

      const presetSize = config.sizes[ratio] as [number, number] | undefined;
      if (!presetSize) return null;

      const [presetW, presetH] = presetSize;
      const presetMax = Math.max(presetW, presetH);

      return {
        width: presetW,
        height: presetH,
        aspectRatio: ratio,
        clamped: presetMax > maxSize
      };
    }

    case 'aspectRatio': {
      if (!config.aspectRatios.includes(ratio)) {
        return null;
      }

      const baseDim = config.defaultDimension || 1024;
      let width: number;
      let height: number;

      if (ratioValue >= 1) {
        width = Math.min(maxSize, baseDim);
        height = Math.round(width / ratioValue);
      } else {
        height = Math.min(maxSize, baseDim);
        width = Math.round(height * ratioValue);
      }

      const step = 64;
      width = Math.round(width / step) * step;
      height = Math.round(height / step) * step;

      return {
        width,
        height,
        aspectRatio: ratio,
        clamped: maxSize < baseDim
      };
    }

    case 'dimensions': {
      const { min, max, step, maxMegapixels } = config;

      let width: number;
      let height: number;

      if (ratioValue >= 1) {
        width = Math.min(maxSize, max);
        height = Math.round(width / ratioValue);
      } else {
        height = Math.min(maxSize, max);
        width = Math.round(height * ratioValue);
      }

      width = Math.max(min, Math.min(max, width));
      height = Math.max(min, Math.min(max, height));

      width = Math.round(width / step) * step;
      height = Math.round(height / step) * step;

      if (maxMegapixels) {
        const currentMP = (width * height) / 1_000_000;
        if (currentMP > maxMegapixels) {
          const scale = Math.sqrt(maxMegapixels / currentMP);
          width = Math.round((width * scale) / step) * step;
          height = Math.round((height * scale) / step) * step;
        }
      }

      const wasClamped = maxSize > max || 
        (maxMegapixels !== undefined && (width * height) / 1_000_000 < (maxSize * (maxSize / ratioValue)) / 1_000_000);

      return {
        width,
        height,
        aspectRatio: ratio,
        clamped: wasClamped
      };
    }

    default:
      return null;
  }
}

export function getAspectRatios(): Record<string, AspectRatioInfo> {
  return manifest.aspectRatios;
}

export function getProviders(): Provider[] {
  return manifest.providers;
}

export function getModel(modelId: string): ImageModel | undefined {
  return manifest.imageModels.find(m => m.id === modelId);
}

export function getProviderModels(providerId: string): ModelResult[] {
  const result = getModels();
  return result[providerId]?.models || [];
}