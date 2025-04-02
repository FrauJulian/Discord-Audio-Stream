import {IJsonDao} from "./IJsonDao";
import {Config, JsonDB} from "node-json-db";

export class JsonDao implements IJsonDao {
    private _jsonDatabaseContext: JsonDB;

    constructor(fileLocation: string) {
        this._jsonDatabaseContext = new JsonDB(new Config(fileLocation, true, false, "/", true));
    }

}