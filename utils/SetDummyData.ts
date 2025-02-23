import type {Plan} from "~/types/types";

export function SetDummyData(): Plan {
    return {
        availableHelpers: [
            {
                id: 1,
                name: "Adam Warlock",
                skills: [
                    "Cooking",
                    "Writing",
                    "Reading"
                ]
            },
            {
                id: 2,
                name: "Iron Heart",
                skills: [
                    "Looking",
                    "Teaching",
                    "Engineering"
                ]
            }
        ],
        events: [
            {
                id: 1,
                name: "Heimspieltag",
                timestamp: new Date(),
                helpers: []
            },
            {
                id: 2,
                name: "Neuer Spieltag",
                timestamp: new Date(),
                helpers: []
            },
            {
                id: 3,
                name: "Auch Spieltag",
                timestamp: new Date(),
                helpers: [
                    {
                        id: 4,
                        name: "New Helper",
                        skills: [
                            "Reading",
                            "Engineering"
                        ]
                    },
                    {
                        id: 5,
                        name: "Thomas die Lokomotive",
                        skills: [
                            "Looking",
                            "Riding"
                        ]
                    }
                ]
            }
        ]
    }
}