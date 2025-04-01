import {JsonDatabaseServices} from "../../InternalServices/DatabaseServices/JsonDatabaseServices";
import {MySqlDatabaseServices} from "../../InternalServices/DatabaseServices/MySqlDatabaseServices";
import {Constants} from "../../Core/Contants";

export class AudioStreamManager {
    constructor(
        databaseType: "Json" | "MySql",
        databaseOptions: {
            Host: string;
            Port: number;
            Username: string;
            Password: string;
            Database: string;
        } | string) {

        if (databaseType === "MySql" &&
            databaseOptions &&
            typeof databaseOptions === "object") {
            console.log("mysql passed")
            Constants.DatabaseServices = new MySqlDatabaseServices(databaseOptions);
        } else if (databaseType === "Json" &&
            databaseOptions &&
            typeof databaseOptions === "string") {
            console.log("json passed")
            Constants.DatabaseServices = new JsonDatabaseServices(databaseOptions);
        } else {
            console.log("err passed")
            throw new Error("Failed validating database.")
        }
    }
}
