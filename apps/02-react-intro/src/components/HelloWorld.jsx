export const HelloWorld = ({ user, id, title = 'Soy un título' }) => {
  return (
    <>
      <div>{title}</div>
      <div>
        que tal! {user} con el id {id}
      </div>
    </>
  );
};
