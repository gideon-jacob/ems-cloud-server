
import { SupabaseClient } from "@supabase/supabase-js";

export const fetchAndGroupData = async (supabase: SupabaseClient, maxLimit: number) => {
    const { data: topRows, error } = await supabase
        .rpc('get_latest_readings_per_room', { limit_count: maxLimit });

    if (error) {
        console.error("Supabase fetch error:", error);
        return null;
    }

    const groupedMap = topRows!.reduce((acc: any, row: any) => {
        if (!acc[row.room_id]) {
            acc[row.room_id] = {
                roomId: row.room_id,
                roomType: row.room_type,
                temperature_c: [],
                humidity_pct: [],
                differential_pressure_pa: []
            };
        }

        acc[row.room_id].temperature_c.push(row.temperature_c);
        acc[row.room_id].humidity_pct.push(row.humidity_pct);
        acc[row.room_id].differential_pressure_pa.push(row.differential_pressure_pa);

        return acc;
    }, {});

    return Object.values(groupedMap);
};

export const sliceGroupedData = (groupedData: any[], limit: number) => {
    return groupedData.map((roomGroup: any) => ({
        ...roomGroup,
        temperature_c: roomGroup.temperature_c.slice(0, limit),
        humidity_pct: roomGroup.humidity_pct.slice(0, limit),
        differential_pressure_pa: roomGroup.differential_pressure_pa.slice(0, limit)
    }));
};
