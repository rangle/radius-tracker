export function midnightToday() {
    return new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z");
}

/**
 * Create a date several weeks ago aligned to a weekly grid —
 * so that dates land on the same day of the week.
 * @param weeksAgo
 */
export function dateWeeksAgo(weeksAgo: number) {
    // Today at 00:00
    const d = midnightToday();

    // Set to preceding Saturday N weeks ago — aligns all commits on a weekly grid
    d.setDate(d.getDate() - 7 * weeksAgo - (d.getDay() + 1) % 7);

    return d;
}
