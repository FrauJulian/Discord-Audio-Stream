import {JsonDatabaseServices} from "../InternalServices/DatabaseServices/JsonDatabaseServices";
import {MySqlDatabaseServices} from "../InternalServices/DatabaseServices/MySqlDatabaseServices";

export class Constants {
    public static DatabaseServices: JsonDatabaseServices | MySqlDatabaseServices | null = null;
}