import {IDatabaseServices} from "./IDatabaseServices";
import {JsonDao} from "../../DataAccess/Json/JsonDao";

export class JsonDatabaseServices implements IDatabaseServices {
    private _databaseDao: JsonDao;

    constructor(databaseOptions : any) {
        this._databaseDao = new JsonDao(databaseOptions);
    }
}