/* App imports */
import { Actions, MidiMap, KitErrors, DeviceType } from 'const';
import { confirmFileOverwrite } from 'actions/modal';
import { showNotice } from 'actions/notice';
import { KitModel, PadModel } from 'state/models';
import { openKitFileDialog } from 'util/fileDialog';
import { getKitAndPadsFromFile as getKitAndPadsFromFileRack } from 'util/kitFile';
import { getKitAndPadsFromFile as getKitAndPadsFromFilePro } from 'util/kitFilePro';
import { saveKitToFile, kitWillOverwriteExisting, detectDeviceTypeFromKitFile } from 'util/storage';

// Device-aware wrapper for getKitAndPadsFromFile
const getKitAndPadsFromFile = (drive, filePath) => {
  return drive.deviceType === DeviceType.SAMPLEPAD_PRO
    ? getKitAndPadsFromFilePro(drive, filePath)
    : getKitAndPadsFromFileRack(drive, filePath);
};

/**
 * Auto-detect and switch device type if kit file doesn't match current mode
 * @param {String} kitFilePath - path to the kit file
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} getState - Redux getState function
 * @returns {Object} Updated state after potential device type change
 */
const autoSwitchDeviceType = (kitFilePath, dispatch, getState) => {
  let state = getState();
  const detectedDeviceType = detectDeviceTypeFromKitFile(kitFilePath);

  if (detectedDeviceType && detectedDeviceType !== state.drive.deviceType) {
    // Auto-switch device type
    dispatch({ type: Actions.SET_DEVICE_TYPE, deviceType: detectedDeviceType });
    const deviceName = detectedDeviceType === DeviceType.SAMPLEPAD_PRO ? 'Samplepad Pro' : 'Samplerack';
    dispatch(showNotice("is-info", `Auto-switched to ${deviceName} mode`));

    // Re-fetch state after device type change
    state = getState();
  }

  return state;
};

/** KIT ACTION CREATORS */
/**
 * Open a file dialog, and parse the resulting file as a SamplePad kit
 */
export function importKitFromFile() {
  return (dispatch, getState) => {
    openKitFileDialog()
      .then(result => {
        if (result.canceled) {
          return null;
        }

        const kitFilePath = result.filePaths[0];

        // Auto-detect and switch device type if needed
        const state = autoSwitchDeviceType(kitFilePath, dispatch, getState);

        try {
          let {kit, pads} = getKitAndPadsFromFile(state.drive, kitFilePath);

          // remove the filename, as a new one will get created
          kit.filePath = state.drive.kitPath;
          kit.fileName = null;

          dispatch({ type: Actions.ADD_PADS, pads: pads });
          dispatch({ type: Actions.ADD_KIT, kit: kit });
          dispatch({ type: Actions.SET_SELECTED_KIT_ID, kitId: kit.id });
          dispatch({ type: Actions.SET_ACTIVE_KIT_ID, kitId: kit.id });
          dispatch({ type: Actions.SORT_KITS });
        } catch (err) {
          console.error(err);
          dispatch(
            showNotice("is-danger", "There was a problem importing this kit.")
          );
          return null;
        }

      })
  }
}
/**
 * load kit details from kit file
 * @param {String} kitId
 */
export function loadKitDetails(kitId) {
  return (dispatch, getState) => {
    let kit = getState().kits.models[kitId];

    if (!kit.isLoaded) {
      let kitFile = kit.filePath + "/" + kit.fileName;

      // Auto-detect and switch device type if needed
      const state = autoSwitchDeviceType(kitFile, dispatch, getState);

      try {
        let result = getKitAndPadsFromFile(state.drive, kitFile);

        dispatch({ type: Actions.ADD_PADS, pads: result.pads });
        dispatch(updateKitState(kitId, {
          "isLoaded": true,
          "kitName": result.kit.kitName,
          "pads": result.kit.pads
        }));
        dispatch({ type: Actions.SORT_KITS });
      } catch (err) {
        // failed kit load - load a default empty kit
        dispatch(loadNewKit({
          id: kit.id,
          isNew: kit.isNew,
          isExisting: kit.isExisting,
          isLoaded: kit.isLoaded,
          filePath: kit.filePath,
          fileName: kit.fileName,
          kitName: kit.kitName,
          originalKitName: kit.kitName,
        }));
      }
    }
  }
}
/**
 * create an empty kit and add it to the kit list
 */
export function loadNewKit(presetData=null) {
  return (dispatch, getState) => {
    let state = getState();

    // create a default set of samples
    let pads = {};

    Object.keys(MidiMap[state.drive.deviceType]).forEach((padType) => {
      let midiNote = MidiMap[state.drive.deviceType][padType][1];
      let pad = PadModel.getPad(padType)
      pad.midiNote = midiNote;
      pads[pad.id] = pad;
    });

    let kit = KitModel(
      state.drive.kitPath,
      null,
      true,
      false,
      true,
      "",
      Object.keys(pads)
    );

    if (presetData) {
      // right now this is only used in the case where an existing kit load failure occurs
      kit = {...kit, ...presetData};
    }

    dispatch({ type: Actions.ADD_PADS, pads: pads });
    dispatch({ type: Actions.ADD_KIT, kit: kit });
    dispatch({ type: Actions.SET_SELECTED_KIT_ID, kitId: kit.id });
    dispatch({ type: Actions.SET_ACTIVE_KIT_ID, kitId: kit.id });
    dispatch({ type: Actions.SORT_KITS });
  }
}
/**
 * save a kit to disk
 * @param {boolean} asNew=false - if true, save this kit as a new kit on disk, do not overwrite the exitings
 */
export function saveKit(kitId, asNew=false, confirmedOverwrite=false) {
  return (dispatch, getState) => {
    let state = getState();
    let kit = state.kits.models[kitId];

    // validate the kit
    if (kit.errors.length) {
      dispatch(
        showNotice("is-danger", "Cannot Save. Please correct all errors before saving the kit.")
      );
      return;
    }

    // validate the pads
    for (let i = 0; i < kit.pads.length; i++) {
      let pad = state.pads[kit.pads[i]];
      if (pad.errors.length) {
        dispatch(
          showNotice("is-danger", "Cannot Save. Please correct all errors before saving the kit.")
        );
        return;
      }
    }

    // if this kit would overwrite an existing one - confirm first
    if (!confirmedOverwrite) {
      let confirm = kitWillOverwriteExisting(kit, asNew);

      if (confirm) {
        // show the warning modal - on confirm, save the kit
        dispatch(confirmFileOverwrite((result) => {
          return (dispatch, getState) => {
            if (result) {
              dispatch(saveKit(kitId, asNew, true));
            }
          }
        }));
        return;
      }
    }

    let fileName = "";
    try {
      fileName = saveKitToFile(state.drive, kit, state.pads, asNew);
    } catch (err) {
      dispatch(
        showNotice("is-danger", "There was a problem saving the kit.")
      );
      return;
    }

    dispatch(updateKitState(kitId, {
      isNew: false,
      isExisting: true,
      originalKitName: kit.kitName,
      fileName: fileName
    }));
    dispatch({ type: Actions.SORT_KITS });
    dispatch(
      showNotice("is-success", "Kit saved.")
    );
  }
}
/**
 * Update the kit name and filename
 * @param {String} kitId
 * @param {?} value
 */
export function updateKitName(kitId, value) {
  return (dispatch, getState) => {
    dispatch(updateKitProperty(kitId, 'kitName', value));
    dispatch({ type: Actions.SORT_KITS });
  }
}
/**
 * Update an individual property of a kit
 * @param {String} kitId
 * @param {String} property
 * @param {?} value
 */
export function updateKitProperty(kitId, property, value) {
  return (dispatch, getState) => {
    dispatch({ type: Actions.UPDATE_KIT_PROPERTY, kitId: kitId, property: property, value: value });
    dispatch(validateKit(kitId));
  }
}
/**
 * Update multiple properties of a kit
 * @param {String} kitId
 * @param {json} newState
 */
export function updateKitState(kitId, newState) {
  return (dispatch, getState) => {
    dispatch({ type: Actions.UPDATE_KIT_STATE, kitId: kitId, newState: newState });
    dispatch(validateKit(kitId));
  }
}
/**
 * Validate all kit params, update the kit state with any new errors
 * @param {String} kitId
 */
export function validateKit(kitId) {
  return (dispatch, getState) => {
    let state = getState();
    let kit = state.kits.models[kitId];
    let prevErrors = kit.errors;
    let errors = [];

    if (!/^[a-z0-9]+$/i.test(kit.kitName)) {
      errors.push(KitErrors.INVALID_KIT_NAME)
    }

    if (prevErrors.length || errors.length) {
      dispatch({ type: Actions.UPDATE_KIT_PROPERTY, kitId: kitId, property: 'errors', value: errors });
    }
  }
}
