import {JsonDatabaseServices} from "../../InternalServices/DatabaseServices/JsonDatabaseServices";
import {MySqlDatabaseServices} from "../../InternalServices/DatabaseServices/MySqlDatabaseServices";
import {Constants} from "../../Core/Contants";
import {ConnectionOptions} from "mysql2/promise";

export class AudioStreamManager {
    constructor(databaseType: "Json" | "MySql", databaseOptions: ConnectionOptions | string) {
        if (databaseType === "MySql" &&
            databaseOptions &&
            typeof databaseOptions === "object") {
            Constants.DatabaseServices = new MySqlDatabaseServices(databaseOptions);
        } else if (databaseType === "Json" &&
            databaseOptions &&
            typeof databaseOptions === "string") {
            Constants.DatabaseServices = new JsonDatabaseServices(databaseOptions);
        } else {
            throw new Error("Failed validating database.")
        }
    }
}
