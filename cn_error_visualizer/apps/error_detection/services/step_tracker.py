class StepTracker:
    def __init__(self):
        self.steps = []

    def add_step(self, title, description, state=None):
        """
        Logs a step in the algorithm.
        :param title: Short title of the step (to be displayed in UI).
        :param description: Human readable explanation.
        :param state: Optional dictionary containing current variables/bits for valid visualization.
        """
        self.steps.append({
            "title": title,
            "description": description,
            "state": state or {}
        })

    def get_steps(self):
        return self.steps
