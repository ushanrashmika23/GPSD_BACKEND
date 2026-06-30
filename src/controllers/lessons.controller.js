const { newLesson, updateLesson, deleteLesson, getLessons } = require("../services/lessons.service");
const { sendResponse, prepareResponse } = require("../utils/responseEntity");

//controller for creating a new lesson
//data is sent in the request body
/*{
    "title":"abcdefghijklmn",
    "description":"abc",
    "type":"PURE"
}*/
const newLessonController = async (req, res) => {
    try {
        const lesson = await newLesson(req.body);
        sendResponse(res, lesson);
        return;
    } catch (err) {
        sendResponse(res, prepareResponse(500, false, "Failed to create lesson controller", err));
    }
}

//controller for updating a lesson
//data is sent in the request body
/*
/<id>
{
    "title":"abcdefghijklmn",
    "description":"abc",
    "type":"PURE"
}
 */
const updateLessonController = async (req, res) => {
    try {
        const lessonId = req.params.id;
        console.log("update body " + JSON.stringify(req.body));

        const lesson = await updateLesson(lessonId, req.body);
        sendResponse(res, lesson);
        return;
    } catch (err) {
        sendResponse(res, prepareResponse(500, false, "Failed to update lesson controller", err));
    }
}

//controller for fetching lessons, search by name, pagination, and limit
/*
page=1&limit=10&search=abc
*/
const getLessonsController = async (req, res) => {
    try {
        const result = await getLessons(req.query);
        sendResponse(res, result);
    } catch (err) {
        sendResponse(res, prepareResponse(500, false, "Failed to fetch lessons controller", err));
    }
}

//controller for deleting a lesson
/*
/<lessonId>
*/
const deleteLessonController = async (req, res) => {
    try {
        const lessonId = req.params.id;
        const result = await deleteLesson(lessonId);
        sendResponse(res, result);
    } catch (err) {
        sendResponse(res, prepareResponse(500, false, "Failed to delete lesson controller", err));
    }
}

module.exports = {
    newLessonController,
    getLessonsController,
    updateLessonController,
    deleteLessonController
}