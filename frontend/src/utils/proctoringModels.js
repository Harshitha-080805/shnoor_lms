import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let faceModel = null;
let objectModel = null;
let loadPromise = null;

export const preloadModels = async () => {
  if (faceModel && objectModel) return { faceModel, objectModel };
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      await tf.ready();
      const [fm, om] = await Promise.all([
        blazeface.load(),
        cocoSsd.load()
      ]);
      faceModel = fm;
      objectModel = om;
      return { faceModel, objectModel };
    } catch (e) {
      console.error("Failed to preload AI models", e);
      throw e;
    }
  })();
  return loadPromise;
};

export const getModels = () => ({ faceModel, objectModel });
