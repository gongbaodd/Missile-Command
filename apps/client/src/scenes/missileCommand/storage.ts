// Re-export Firebase storage functions for backward compatibility
export {
	serializeHouses,
	serializeMissiles,
	saveRoomData as saveHouses,
	loadRoomData,
	listenToRoomData,
	getRoomHash,
	checkRoomExists,
	type SerializedHouse,
	type SerializedMissile,
	type SerializedRoomData
} from "./firebase";


